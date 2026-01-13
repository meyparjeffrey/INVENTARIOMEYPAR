import type { Product, UUID } from '@domain/entities';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from '@domain/repositories/ProductRepository';
import type { MovementService } from './MovementService';

/**
 * Servicio de lógica de negocio para productos.
 * Maneja validaciones, reglas de negocio y auditoría.
 */
export class ProductService {
  constructor(
    private repository: ProductRepository,
    private movementService?: MovementService,
  ) {}

  /**
   * Obtiene todos los productos aplicando filtros (sin paginación).
   */
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    return this.repository.getAll(filters);
  }

  /**
   * Valida que el código no esté duplicado.
   */
  async validateCodeUnique(code: string, excludeId?: UUID): Promise<boolean> {
    const existing = await this.repository.findByCodeOrBarcode(code);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Valida que el barcode no esté duplicado.
   */
  async validateBarcodeUnique(barcode: string, excludeId?: UUID): Promise<boolean> {
    if (!barcode) return true;
    const existing = await this.repository.findByCodeOrBarcode(barcode);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Valida los datos de entrada para crear un producto.
   */
  async validateCreate(input: CreateProductInput): Promise<string | null> {
    // Validar código único
    const codeUnique = await this.validateCodeUnique(input.code);
    if (!codeUnique) {
      return 'Este código ya existe. Elige otro.';
    }

    // Validar barcode único si se proporciona
    if (input.barcode) {
      const barcodeUnique = await this.validateBarcodeUnique(input.barcode);
      if (!barcodeUnique) {
        return 'Este código de barras ya está en uso.';
      }
    }

    // Validar stock
    if (input.stockMin < 0) {
      return 'El stock mínimo no puede ser negativo.';
    }

    if (input.stockMax !== null && input.stockMax !== undefined) {
      if (input.stockMax < input.stockMin) {
        return 'El stock máximo no puede ser menor que el mínimo.';
      }
    }

    // Validar precios
    if (input.costPrice < 0) {
      return 'El precio de coste no puede ser negativo.';
    }

    if (
      input.salePrice !== null &&
      input.salePrice !== undefined &&
      input.salePrice < input.costPrice
    ) {
      return 'El precio de venta no puede ser menor que el de coste.';
    }

    // Validar dimensiones si se proporcionan
    if (input.dimensionsCm) {
      const { length, width, height } = input.dimensionsCm;
      if (length <= 0 || width <= 0 || height <= 0) {
        return 'Las dimensiones deben ser números positivos.';
      }
    }

    return null;
  }

  /**
   * Valida los datos de entrada para actualizar un producto.
   */
  async validateUpdate(id: UUID, input: UpdateProductInput): Promise<string | null> {
    // Validar código único si se cambia
    if (input.code !== undefined) {
      const codeUnique = await this.validateCodeUnique(input.code, id);
      if (!codeUnique) {
        return 'Este código ya existe. Elige otro.';
      }
    }

    // Validar barcode único si se cambia
    if (input.barcode !== undefined && input.barcode) {
      const barcodeUnique = await this.validateBarcodeUnique(input.barcode, id);
      if (!barcodeUnique) {
        return 'Este código de barras ya está en uso.';
      }
    }

    // Validar stock si se actualiza
    const product = await this.repository.findById(id);
    if (!product) {
      return 'Producto no encontrado.';
    }

    const stockMin = input.stockMin ?? product.stockMin;
    const stockMax = input.stockMax ?? product.stockMax;

    if (stockMax !== null && stockMax !== undefined) {
      if (stockMax < stockMin) {
        return 'El stock máximo no puede ser menor que el mínimo.';
      }
    }

    // Validar precios si se actualizan
    const costPrice = input.costPrice ?? product.costPrice;
    const salePrice = input.salePrice ?? product.salePrice;

    if (salePrice !== null && salePrice !== undefined) {
      if (salePrice < costPrice) {
        return 'El precio de venta no puede ser menor que el de coste.';
      }
    }

    return null;
  }

  /**
   * Crea un nuevo producto con validaciones.
   */
  async create(input: CreateProductInput): Promise<Product> {
    const error = await this.validateCreate(input);
    if (error) {
      throw new Error(error);
    }

    return this.repository.create(input);
  }

  /**
   * Actualiza un producto existente con validaciones.
   * Registra movimientos automáticamente cuando hay cambios relevantes.
   */
  async update(id: UUID, input: UpdateProductInput, userId?: UUID): Promise<Product> {
    const error = await this.validateUpdate(id, input);
    if (error) {
      throw new Error(error);
    }

    // Obtener producto actual para comparar cambios
    const productBefore = await this.repository.findById(id);
    if (!productBefore) {
      throw new Error('Producto no encontrado.');
    }

    // Actualizar el producto
    const productAfter = await this.repository.update(id, input);

    // Registrar movimientos automáticos si hay cambios relevantes
    if (this.movementService && userId) {
      try {
        await this.recordAutomaticMovements(productBefore, productAfter, input, userId);
      } catch (err) {
        // No bloqueamos la actualización si falla el registro de movimientos
        // eslint-disable-next-line no-console
        console.error('Error en recordAutomaticMovements:', err);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('No se registran movimientos automáticos:', {
        hasMovementService: !!this.movementService,
        hasUserId: !!userId,
      });
    }

    return productAfter;
  }

  /**
   * Registra movimientos automáticos cuando se edita un producto.
   */
  private async recordAutomaticMovements(
    productBefore: Product,
    productAfter: Product,
    input: UpdateProductInput,
    userId: UUID,
  ): Promise<void> {
    if (!this.movementService) {
      // eslint-disable-next-line no-console
      console.warn('MovementService no disponible');
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      '🔍 Registrando movimientos automáticos para producto:',
      productBefore.id,
    );
    // eslint-disable-next-line no-console
    console.log('   userId:', userId);
    // eslint-disable-next-line no-console
    console.log('   hasMovementService:', !!this.movementService);
    // eslint-disable-next-line no-console
    console.log(
      '   input.stockCurrent:',
      input.stockCurrent,
      'vs productBefore.stockCurrent:',
      productBefore.stockCurrent,
    );
    // eslint-disable-next-line no-console
    console.log(
      '   input.name:',
      input.name,
      'vs productBefore.name:',
      productBefore.name,
    );
    // eslint-disable-next-line no-console
    console.log(
      '   input.code:',
      input.code,
      'vs productBefore.code:',
      productBefore.code,
    );
    // eslint-disable-next-line no-console
    console.log(
      '   input.supplierCode:',
      input.supplierCode,
      'vs productBefore.supplierCode:',
      productBefore.supplierCode,
    );
    // eslint-disable-next-line no-console
    console.log(
      '   input.barcode:',
      input.barcode,
      'vs productBefore.barcode:',
      productBefore.barcode,
    );

    const changes: string[] = [];
    let stockChange: { before: number; after: number; diff: number } | null = null;

    // Detectar cambio de stock
    if (
      input.stockCurrent !== undefined &&
      input.stockCurrent !== productBefore.stockCurrent
    ) {
      const stockDiff = input.stockCurrent - productBefore.stockCurrent;
      const absDiff = Math.abs(stockDiff);

      if (absDiff > 0) {
        stockChange = {
          before: productBefore.stockCurrent,
          after: input.stockCurrent,
          diff: absDiff,
        };
        changes.push(`Stock: ${productBefore.stockCurrent} → ${input.stockCurrent}`);
      }
    }

    // Función helper para normalizar valores null/undefined
    const normalizeValue = (val: string | null | undefined): string => {
      return val === null || val === undefined ? '' : String(val);
    };

    // Detectar otros cambios importantes (normalizando null/undefined)
    if (
      input.name !== undefined &&
      normalizeValue(input.name) !== normalizeValue(productBefore.name)
    ) {
      changes.push(`Nombre: "${productBefore.name || 'N/A'}" → "${input.name || 'N/A'}"`);
    }

    if (
      input.code !== undefined &&
      normalizeValue(input.code) !== normalizeValue(productBefore.code)
    ) {
      changes.push(`Código: "${productBefore.code || 'N/A'}" → "${input.code || 'N/A'}"`);
    }

    if (
      input.aisle !== undefined &&
      normalizeValue(input.aisle) !== normalizeValue(productBefore.aisle)
    ) {
      changes.push(
        `Pasillo: "${productBefore.aisle || 'N/A'}" → "${input.aisle || 'N/A'}"`,
      );
    }

    if (
      input.shelf !== undefined &&
      normalizeValue(input.shelf) !== normalizeValue(productBefore.shelf)
    ) {
      changes.push(
        `Estante: "${productBefore.shelf || 'N/A'}" → "${input.shelf || 'N/A'}"`,
      );
    }

    if (
      input.locationExtra !== undefined &&
      normalizeValue(input.locationExtra) !== normalizeValue(productBefore.locationExtra)
    ) {
      changes.push(
        `Ubicación extra: "${productBefore.locationExtra || 'N/A'}" → "${input.locationExtra || 'N/A'}"`,
      );
    }

    if (
      input.supplierCode !== undefined &&
      normalizeValue(input.supplierCode) !== normalizeValue(productBefore.supplierCode)
    ) {
      changes.push(
        `Código proveedor: "${productBefore.supplierCode || 'N/A'}" → "${input.supplierCode || 'N/A'}"`,
      );
    }

    if (
      input.barcode !== undefined &&
      normalizeValue(input.barcode) !== normalizeValue(productBefore.barcode)
    ) {
      changes.push(
        `Código de barras: "${productBefore.barcode || 'N/A'}" → "${input.barcode || 'N/A'}"`,
      );
    }

    // Si hay cambios, crear UN SOLO movimiento que combine todo
    if (changes.length > 0) {
      try {
        const quantity = stockChange ? stockChange.diff : 0;
        const quantityBefore = stockChange
          ? stockChange.before
          : productBefore.stockCurrent;
        const quantityAfter = stockChange ? stockChange.after : productAfter.stockCurrent;

        // Construir el motivo principal
        let requestReason = 'Ajuste automático: ';
        if (stockChange) {
          requestReason +=
            stockChange.diff > 0
              ? `Stock aumentado de ${stockChange.before} a ${stockChange.after}`
              : `Stock disminuido de ${stockChange.before} a ${stockChange.after}`;
          if (changes.length > 1) {
            requestReason += ' y otros cambios';
          }
        } else {
          requestReason += 'Cambios en propiedades del producto';
        }

        // Construir comentarios detallados con todos los cambios
        const commentsParts: string[] = [];
        if (stockChange) {
          commentsParts.push(`Stock: ${stockChange.before} → ${stockChange.after}`);
        }
        const otherChanges = changes.filter((c) => !c.startsWith('Stock:'));
        if (otherChanges.length > 0) {
          commentsParts.push(...otherChanges);
        }
        const comments = commentsParts.join('; ');

        await this.movementService.recordMovementOnly({
          productId: productBefore.id,
          userId,
          movementType: 'ADJUSTMENT',
          quantity,
          quantityBefore,
          quantityAfter,
          requestReason,
          reasonCategory: 'CORRECTION',
          comments,
        });
        // eslint-disable-next-line no-console
        console.log('✅ Movimiento único registrado exitosamente con todos los cambios');
        // eslint-disable-next-line no-console
        console.log('   Cambios incluidos:', changes.length);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ Error registrando movimiento automático:', err);
        // eslint-disable-next-line no-console
        if (err instanceof Error) {
          console.error('   Mensaje:', err.message);
          console.error('   Stack:', err.stack);
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('   ℹ️  No se detectaron cambios relevantes para registrar movimiento');
    }
  }

  /**
   * Elimina físicamente un producto de la base de datos.
   *
   * IMPORTANTE: Esta es una eliminación permanente e irreversible.
   * El producto se eliminará completamente de Supabase junto con sus relaciones
   * según las políticas CASCADE configuradas en la base de datos.
   *
   * @param {UUID} id - ID del producto a eliminar
   * @returns {Promise<Product>} El producto eliminado (para mostrar información en el diálogo)
   * @throws {Error} Si el producto no existe
   */
  async delete(id: UUID): Promise<Product> {
    // Verificar que el producto existe
    const product = await this.repository.findById(id);
    if (!product) {
      throw new Error('Producto no encontrado.');
    }

    // Eliminación física permanente (sin restricción de stock)
    await this.repository.delete(id);
    return product;
  }
}
