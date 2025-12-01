import type {
  BatchDefectReport,
  Product,
  ProductBatch,
  UUID
} from "@domain/entities";
import type { PaginationParams, PaginatedResult } from "./types";

export interface ProductFilters {
  search?: string;
  category?: string;
  includeInactive?: boolean;
  isBatchTracked?: boolean;
  lowStock?: boolean; // Filtro para productos con stock <= stock_min
}

export interface BatchFilters {
  status?: ProductBatch["status"][];
  expiryBefore?: string;
  expiryAfter?: string;
  onlyAvailable?: boolean;
}

export interface CreateProductInput {
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  stockCurrent?: number;
  stockMin: number;
  stockMax?: number | null;
  aisle: string;
  shelf: string;
  locationExtra?: string | null;
  costPrice: number;
  salePrice?: string | null;
  purchaseUrl?: string | null;
  imageUrl?: string | null;
  supplierCode?: string | null; // Código de Proveedor
  isActive?: boolean;
  isBatchTracked: boolean;
  unitOfMeasure?: string | null;
  weightKg?: number | null;
  dimensionsCm?: Product["dimensionsCm"];
  notes?: string | null;
  createdBy: UUID;
}

export interface UpdateProductInput {
  code?: string;
  barcode?: string | null;
  name?: string;
  description?: string | null;
  category?: string | null;
  stockCurrent?: number;
  stockMin?: number;
  stockMax?: number | null;
  aisle?: string;
  shelf?: string;
  locationExtra?: string | null;
  costPrice?: number;
  salePrice?: number | null;
  purchaseUrl?: string | null;
  imageUrl?: string | null;
  supplierCode?: string | null; // Código de Proveedor
  isActive?: boolean;
  isBatchTracked?: boolean;
  unitOfMeasure?: string | null;
  weightKg?: number | null;
  dimensionsCm?: Product["dimensionsCm"];
  notes?: string | null;
  updatedBy: UUID;
}

export interface ProductRepository {
  /**
   * Lista productos aplicando filtros básicos y paginación.
   */
  list(
    filters?: ProductFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Product>>;

  /**
   * Recupera un producto por ID.
   */
  findById(id: UUID): Promise<Product | null>;

  /**
   * Busca un producto por su código interno o por barcode.
   */
  findByCodeOrBarcode(term: string): Promise<Product | null>;

  /**
   * Crea un nuevo producto.
   */
  create(input: CreateProductInput): Promise<Product>;

  /**
   * Actualiza un producto existente.
   */
  update(id: UUID, input: UpdateProductInput): Promise<Product>;

  /**
   * Elimina (baja lógica) un producto estableciendo is_active = false.
   */
  delete(id: UUID): Promise<void>;

  /**
   * Obtiene los lotes asociados a un producto concreto.
   */
  getBatches(productId: UUID, filters?: BatchFilters): Promise<ProductBatch[]>;

  /**
   * Lista todos los lotes con filtros y paginación.
   */
  listBatches(
    filters?: BatchFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ProductBatch>>;

  /**
   * Actualiza el estado de un lote.
   */
  updateBatchStatus(
    batchId: UUID,
    status: ProductBatch["status"],
    reason?: string
  ): Promise<ProductBatch>;

  /**
   * Recupera los reportes de defectos asociados a un lote.
   */
  getDefectReports(batchId: UUID): Promise<BatchDefectReport[]>;
}

