import type {
  InventoryMovement,
  MovementType,
  MovementReasonCategory,
  UUID,
} from '@domain/entities';
import type {
  CreateInventoryMovementInput,
  InventoryMovementRepository,
  MovementFilters,
} from '@domain/repositories/InventoryMovementRepository';
import type { ProductRepository } from '@domain/repositories/ProductRepository';
import type { PaginationParams } from '@domain/repositories/types';

/**
 * Servicio de lógica de negocio para movimientos de inventario.
 * Maneja validaciones, actualización de stock y reglas de negocio.
 */
export class MovementService {
  constructor(
    private movementRepository: InventoryMovementRepository,
    private productRepository: ProductRepository,
  ) {}

  /**
   * Lista movimientos con filtros y paginación.
   */
  async list(filters?: MovementFilters, pagination?: PaginationParams) {
    return this.movementRepository.list(filters, pagination);
  }

  /**
   * Registra un movimiento y actualiza el stock del producto en el almacén específico.
   * @throws Error si el producto no existe o el stock resultante sería negativo.
   */
  async recordMovement(input: {
    productId: UUID;
    batchId?: UUID;
    userId?: UUID;
    movementType: MovementType;
    quantity: number;
    requestReason: string;
    reasonCategory?: MovementReasonCategory;
    referenceDocument?: string;
    comments?: string;
    warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Almacén donde se realiza el movimiento
  }): Promise<InventoryMovement> {
    // Validar cantidad
    if (input.quantity <= 0) {
      throw new Error('La cantidad debe ser mayor que 0.');
    }

    // Obtener producto actual
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    // Si no se especifica almacén, usar el almacén primario del producto o MEYPAR por defecto
    const targetWarehouse = input.warehouse || product.warehouse || 'MEYPAR';

    // Obtener ubicaciones del producto para calcular stock actual del almacén específico
    const locations = await this.productRepository.getProductLocations(input.productId);

    // Calcular stock actual del almacén específico
    // Para MEYPAR: sumar todas las ubicaciones de MEYPAR
    // Para OLIVA_TORRAS/FURGONETA: sumar solo las ubicaciones de ese almacén
    let currentStockInWarehouse = 0;
    if (targetWarehouse === 'MEYPAR') {
      currentStockInWarehouse = locations
        .filter((loc) => loc.warehouse === 'MEYPAR')
        .reduce((sum, loc) => sum + (loc.quantity ?? 0), 0);
    } else {
      currentStockInWarehouse = locations
        .filter((loc) => loc.warehouse === targetWarehouse)
        .reduce((sum, loc) => sum + (loc.quantity ?? 0), 0);
    }

    // Calcular nuevo stock del almacén específico
    const quantityBefore = currentStockInWarehouse;
    let quantityAfter: number;

    switch (input.movementType) {
      case 'IN':
        quantityAfter = quantityBefore + input.quantity;
        break;
      case 'OUT':
        quantityAfter = quantityBefore - input.quantity;
        if (quantityAfter < 0) {
          throw new Error(
            `Stock insuficiente en ${targetWarehouse}. Stock actual: ${quantityBefore}, cantidad solicitada: ${input.quantity}`,
          );
        }
        break;
      case 'ADJUSTMENT':
        // El adjustment puede ser positivo o negativo según la razón
        if (
          input.reasonCategory === 'CORRECTION' ||
          input.reasonCategory === 'INVENTORY_COUNT'
        ) {
          // Para correcciones, la cantidad representa el nuevo stock
          quantityAfter = input.quantity;
        } else {
          // Para otros ajustes, se suma/resta según el tipo
          quantityAfter = quantityBefore + input.quantity;
        }
        break;
      case 'TRANSFER':
        // Transfer es una salida del origen
        quantityAfter = quantityBefore - input.quantity;
        if (quantityAfter < 0) {
          throw new Error(
            `Stock insuficiente para transferir desde ${targetWarehouse}. Stock actual: ${quantityBefore}`,
          );
        }
        break;
      default:
        throw new Error(`Tipo de movimiento no válido: ${input.movementType}`);
    }

    // Crear el payload completo
    const movementPayload: CreateInventoryMovementInput = {
      productId: input.productId,
      batchId: input.batchId,
      userId: input.userId,
      movementType: input.movementType,
      quantity: input.quantity,
      quantityBefore,
      quantityAfter,
      requestReason: input.requestReason,
      reasonCategory: input.reasonCategory,
      referenceDocument: input.referenceDocument,
      comments: input.comments,
      warehouse: targetWarehouse,
    };

    // Registrar movimiento
    const movement = await this.movementRepository.recordMovement(movementPayload);

    // Actualizar stock del producto en el almacén específico usando product_locations
    await this.updateProductStockByWarehouse(
      input.productId,
      targetWarehouse,
      quantityAfter,
      quantityBefore,
      input.userId,
    );

    return movement;
  }

  /**
   * Registra un movimiento SIN actualizar el stock del producto.
   * Útil cuando el stock ya fue actualizado previamente (ej: edición de producto).
   */
  async recordMovementOnly(input: {
    productId: UUID;
    batchId?: UUID;
    userId?: UUID;
    movementType: MovementType;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    requestReason: string;
    reasonCategory?: MovementReasonCategory;
    referenceDocument?: string;
    comments?: string;
    warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  }): Promise<InventoryMovement> {
    const movementPayload: CreateInventoryMovementInput = {
      productId: input.productId,
      batchId: input.batchId,
      userId: input.userId,
      movementType: input.movementType,
      quantity: input.quantity,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      requestReason: input.requestReason,
      reasonCategory: input.reasonCategory,
      referenceDocument: input.referenceDocument,
      comments: input.comments,
      warehouse: input.warehouse,
    };

    // Solo registrar movimiento, sin actualizar stock
    return await this.movementRepository.recordMovement(movementPayload);
  }

  /**
   * Actualiza el stock del producto en un almacén específico usando product_locations.
   * Para MEYPAR: actualiza todas las ubicaciones de MEYPAR proporcionalmente o la primera.
   * Para OLIVA_TORRAS/FURGONETA: actualiza la ubicación específica o crea una si no existe.
   */
  private async updateProductStockByWarehouse(
    productId: UUID,
    warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
    newTotalQuantity: number,
    oldTotalQuantity: number,
    userId?: UUID,
  ): Promise<void> {
    const locations = await this.productRepository.getProductLocations(productId);
    const warehouseLocations = locations.filter((loc) => loc.warehouse === warehouse);
    const diff = newTotalQuantity - oldTotalQuantity;

    if (warehouse === 'MEYPAR') {
      // Para MEYPAR: todas las ubicaciones suman su stock (no se diferencia entre ubicaciones en el desglose)
      // Pero mantenemos las ubicaciones individuales y actualizamos proporcionalmente
      if (warehouseLocations.length === 0) {
        // Si no hay ubicaciones de MEYPAR, crear una por defecto
        await this.productRepository.addProductLocation(
          productId,
          'MEYPAR',
          '1',
          'A',
          newTotalQuantity,
          true, // Primaria
          userId,
        );
      } else {
        // Actualizar proporcionalmente todas las ubicaciones de MEYPAR
        const currentTotal = warehouseLocations.reduce(
          (sum, loc) => sum + (loc.quantity ?? 0),
          0,
        );

        if (currentTotal === 0 && newTotalQuantity > 0) {
          // Si no hay stock, añadir todo a la primera ubicación (o primaria)
          const targetLocation =
            warehouseLocations.find((loc) => loc.isPrimary) || warehouseLocations[0];
          if (targetLocation?.id) {
            await this.productRepository.updateLocationQuantity(
              targetLocation.id,
              newTotalQuantity,
              userId,
            );
          }
        } else if (currentTotal > 0 && diff !== 0) {
          // Distribuir el cambio proporcionalmente entre todas las ubicaciones
          // Mantener la proporción relativa entre ubicaciones
          for (const loc of warehouseLocations) {
            if (loc.id) {
              const currentQty = loc.quantity ?? 0;
              const proportion = currentQty / currentTotal;
              const newQty = Math.max(0, Math.round(newTotalQuantity * proportion));
              await this.productRepository.updateLocationQuantity(loc.id, newQty, userId);
            }
          }
        }
      }
    } else {
      // Para OLIVA_TORRAS o FURGONETA: actualizar la ubicación específica o crear una
      if (warehouseLocations.length === 0) {
        // Crear ubicación si no existe
        const aisle = warehouse === 'OLIVA_TORRAS' ? '' : 'FURGONETA';
        const shelf = warehouse === 'OLIVA_TORRAS' ? '' : 'Técnico';
        await this.productRepository.addProductLocation(
          productId,
          warehouse,
          aisle,
          shelf,
          newTotalQuantity,
          false,
          userId,
        );
      } else {
        // Actualizar la primera ubicación del almacén (normalmente solo hay una)
        if (warehouseLocations[0]?.id) {
          await this.productRepository.updateLocationQuantity(
            warehouseLocations[0].id,
            newTotalQuantity,
            userId,
          );
        }
      }
    }
  }

  /**
   * Obtiene estadísticas de movimientos para un período.
   */
  async getStats(dateFrom: string, dateTo: string) {
    const { data: movements } = await this.movementRepository.list(
      { dateFrom, dateTo },
      { page: 1, pageSize: 1000 },
    );

    const stats = {
      totalIn: 0,
      totalOut: 0,
      totalAdjustments: 0,
      totalTransfers: 0,
      byCategory: {} as Record<string, number>,
    };

    for (const m of movements) {
      switch (m.movementType) {
        case 'IN':
          stats.totalIn += m.quantity;
          break;
        case 'OUT':
          stats.totalOut += m.quantity;
          break;
        case 'ADJUSTMENT':
          stats.totalAdjustments += 1;
          break;
        case 'TRANSFER':
          stats.totalTransfers += m.quantity;
          break;
      }

      if (m.reasonCategory) {
        stats.byCategory[m.reasonCategory] =
          (stats.byCategory[m.reasonCategory] || 0) + m.quantity;
      }
    }

    return stats;
  }
}
