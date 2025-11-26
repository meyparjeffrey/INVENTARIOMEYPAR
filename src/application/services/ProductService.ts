import type { Product, UUID } from "@domain/entities";
import type {
  CreateProductInput,
  ProductRepository,
  UpdateProductInput
} from "@domain/repositories/ProductRepository";

/**
 * Servicio de lógica de negocio para productos.
 * Maneja validaciones, reglas de negocio y auditoría.
 */
export class ProductService {
  constructor(private repository: ProductRepository) {}

  /**
   * Valida que el código no esté duplicado.
   */
  async validateCodeUnique(
    code: string,
    excludeId?: UUID
  ): Promise<boolean> {
    const existing = await this.repository.findByCodeOrBarcode(code);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Valida que el barcode no esté duplicado.
   */
  async validateBarcodeUnique(
    barcode: string,
    excludeId?: UUID
  ): Promise<boolean> {
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
      return "Este código ya existe. Elige otro.";
    }

    // Validar barcode único si se proporciona
    if (input.barcode) {
      const barcodeUnique = await this.validateBarcodeUnique(input.barcode);
      if (!barcodeUnique) {
        return "Este código de barras ya está en uso.";
      }
    }

    // Validar stock
    if (input.stockMin < 0) {
      return "El stock mínimo no puede ser negativo.";
    }

    if (input.stockMax !== null && input.stockMax !== undefined) {
      if (input.stockMax < input.stockMin) {
        return "El stock máximo no puede ser menor que el mínimo.";
      }
    }

    // Validar precios
    if (input.costPrice < 0) {
      return "El precio de coste no puede ser negativo.";
    }

    if (
      input.salePrice !== null &&
      input.salePrice !== undefined &&
      input.salePrice < input.costPrice
    ) {
      return "El precio de venta no puede ser menor que el de coste.";
    }

    // Validar dimensiones si se proporcionan
    if (input.dimensionsCm) {
      const { length, width, height } = input.dimensionsCm;
      if (length <= 0 || width <= 0 || height <= 0) {
        return "Las dimensiones deben ser números positivos.";
      }
    }

    return null;
  }

  /**
   * Valida los datos de entrada para actualizar un producto.
   */
  async validateUpdate(
    id: UUID,
    input: UpdateProductInput
  ): Promise<string | null> {
    // Validar código único si se cambia
    if (input.code !== undefined) {
      const codeUnique = await this.validateCodeUnique(input.code, id);
      if (!codeUnique) {
        return "Este código ya existe. Elige otro.";
      }
    }

    // Validar barcode único si se cambia
    if (input.barcode !== undefined && input.barcode) {
      const barcodeUnique = await this.validateBarcodeUnique(input.barcode, id);
      if (!barcodeUnique) {
        return "Este código de barras ya está en uso.";
      }
    }

    // Validar stock si se actualiza
    const product = await this.repository.findById(id);
    if (!product) {
      return "Producto no encontrado.";
    }

    const stockMin = input.stockMin ?? product.stockMin;
    const stockMax = input.stockMax ?? product.stockMax;

    if (stockMax !== null && stockMax !== undefined) {
      if (stockMax < stockMin) {
        return "El stock máximo no puede ser menor que el mínimo.";
      }
    }

    // Validar precios si se actualizan
    const costPrice = input.costPrice ?? product.costPrice;
    const salePrice = input.salePrice ?? product.salePrice;

    if (salePrice !== null && salePrice !== undefined) {
      if (salePrice < costPrice) {
        return "El precio de venta no puede ser menor que el de coste.";
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
   */
  async update(id: UUID, input: UpdateProductInput): Promise<Product> {
    const error = await this.validateUpdate(id, input);
    if (error) {
      throw new Error(error);
    }

    return this.repository.update(id, input);
  }

  /**
   * Elimina (baja lógica) un producto.
   */
  async delete(id: UUID): Promise<void> {
    // Verificar que el producto existe
    const product = await this.repository.findById(id);
    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    // Verificar que no tenga stock
    if (product.stockCurrent > 0) {
      throw new Error(
        "No se puede eliminar un producto con stock. Primero reduce el stock a 0."
      );
    }

    return this.repository.delete(id);
  }
}

