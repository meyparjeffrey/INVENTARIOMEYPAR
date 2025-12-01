import type {
  InventoryMovement,
  MovementType,
  MovementReasonCategory,
  UUID
} from "@domain/entities";
import type {
  CreateInventoryMovementInput,
  InventoryMovementRepository,
  MovementFilters
} from "@domain/repositories/InventoryMovementRepository";
import type { ProductRepository } from "@domain/repositories/ProductRepository";
import type { PaginationParams } from "@domain/repositories/types";

/**
 * Servicio de lógica de negocio para movimientos de inventario.
 * Maneja validaciones, actualización de stock y reglas de negocio.
 */
export class MovementService {
  constructor(
    private movementRepository: InventoryMovementRepository,
    private productRepository: ProductRepository
  ) {}

  /**
   * Lista movimientos con filtros y paginación.
   */
  async list(filters?: MovementFilters, pagination?: PaginationParams) {
    return this.movementRepository.list(filters, pagination);
  }

  /**
   * Registra un movimiento y actualiza el stock del producto.
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
  }): Promise<InventoryMovement> {
    // Validar cantidad
    if (input.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor que 0.");
    }

    // Obtener producto actual
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    // Calcular nuevo stock
    const quantityBefore = product.stockCurrent;
    let quantityAfter: number;

    switch (input.movementType) {
      case "IN":
        quantityAfter = quantityBefore + input.quantity;
        break;
      case "OUT":
        quantityAfter = quantityBefore - input.quantity;
        if (quantityAfter < 0) {
          throw new Error(
            `Stock insuficiente. Stock actual: ${quantityBefore}, cantidad solicitada: ${input.quantity}`
          );
        }
        break;
      case "ADJUSTMENT":
        // El adjustment puede ser positivo o negativo según la razón
        if (input.reasonCategory === "CORRECTION" || input.reasonCategory === "INVENTORY_COUNT") {
          // Para correcciones, la cantidad representa el nuevo stock
          quantityAfter = input.quantity;
        } else {
          // Para otros ajustes, se suma/resta según el tipo
          quantityAfter = quantityBefore + input.quantity;
        }
        break;
      case "TRANSFER":
        // Transfer es una salida del origen
        quantityAfter = quantityBefore - input.quantity;
        if (quantityAfter < 0) {
          throw new Error(
            `Stock insuficiente para transferir. Stock actual: ${quantityBefore}`
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
      comments: input.comments
    };

    // Registrar movimiento
    const movement = await this.movementRepository.recordMovement(movementPayload);

    // Actualizar stock del producto
    await this.productRepository.update(input.productId, {
      stockCurrent: quantityAfter
    });

    return movement;
  }

  /**
   * Obtiene estadísticas de movimientos para un período.
   */
  async getStats(dateFrom: string, dateTo: string) {
    const { data: movements } = await this.movementRepository.list(
      { dateFrom, dateTo },
      { page: 1, pageSize: 1000 }
    );

    const stats = {
      totalIn: 0,
      totalOut: 0,
      totalAdjustments: 0,
      totalTransfers: 0,
      byCategory: {} as Record<string, number>
    };

    for (const m of movements) {
      switch (m.movementType) {
        case "IN":
          stats.totalIn += m.quantity;
          break;
        case "OUT":
          stats.totalOut += m.quantity;
          break;
        case "ADJUSTMENT":
          stats.totalAdjustments += 1;
          break;
        case "TRANSFER":
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

