import type { BatchDefectReport, Product, ProductBatch, UUID } from '@domain/entities';
import type { PaginationParams, PaginatedResult } from './types';

export interface ProductFilters {
  search?: string;
  category?: string;
  includeInactive?: boolean;
  isBatchTracked?: boolean;
  lowStock?: boolean; // Filtro para productos con stock <= stock_min
  stockNearMinimum?: boolean; // Filtro para productos con stock <= stock_min * 1.15 (15% sobre mínimo)
  lastModifiedFrom?: string; // Fecha desde (ISO string)
  lastModifiedTo?: string; // Fecha hasta (ISO string)
  lastModifiedType?: 'entries' | 'exits' | 'both'; // Tipo de modificación: entradas, salidas, ambas
  stockMin?: number; // Stock mínimo (filtro por rango)
  stockMax?: number; // Stock máximo (filtro por rango)
  priceMin?: number; // Precio mínimo (filtro por rango de cost_price)
  priceMax?: number; // Precio máximo (filtro por rango de cost_price)
  supplierCode?: string; // Código de proveedor
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Filtro por almacén
  // Nuevos filtros
  aisle?: string; // Pasillo (ubicación)
  shelf?: string; // Estante (ubicación)
  batchStatus?: ('OK' | 'DEFECTIVE' | 'BLOCKED' | 'EXPIRED')[]; // Estado de lote
  stockMinMin?: number; // Stock mínimo mínimo (filtro por rango de stock_min)
  stockMinMax?: number; // Stock mínimo máximo (filtro por rango de stock_min)
  createdAtFrom?: string; // Fecha de creación desde (ISO string)
  createdAtTo?: string; // Fecha de creación hasta (ISO string)
}

export interface BatchFilters {
  status?: ProductBatch['status'][];
  expiryBefore?: string;
  expiryAfter?: string;
  onlyAvailable?: boolean;
  search?: string; // Búsqueda por código o barcode
}

export interface CreateBatchInput {
  productId: UUID;
  supplierId?: UUID | null;
  batchCode: string;
  batchBarcode?: string | null;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved?: number;
  defectiveQty?: number;
  status?: ProductBatch['status'];
  blockedReason?: string | null;
  qualityScore?: number;
  receivedAt?: string;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  costPerUnit?: number | null;
  locationOverride?: string | null;
  notes?: string | null;
  createdBy: UUID;
}

export interface UpdateBatchInput {
  batchCode?: string;
  batchBarcode?: string | null;
  quantityTotal?: number;
  quantityAvailable?: number;
  quantityReserved?: number;
  defectiveQty?: number;
  status?: ProductBatch['status'];
  blockedReason?: string | null;
  qualityScore?: number;
  receivedAt?: string;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  costPerUnit?: number | null;
  locationOverride?: string | null;
  notes?: string | null;
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
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  costPrice: number;
  salePrice?: string | null;
  purchaseUrl?: string | null;
  imageUrl?: string | null;
  supplierCode?: string | null; // Código de Proveedor
  isActive?: boolean;
  isBatchTracked: boolean;
  unitOfMeasure?: string | null;
  weightKg?: number | null;
  dimensionsCm?: Product['dimensionsCm'];
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
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  costPrice?: number;
  salePrice?: number | null;
  purchaseUrl?: string | null;
  imageUrl?: string | null;
  supplierCode?: string | null; // Código de Proveedor
  isActive?: boolean;
  isBatchTracked?: boolean;
  unitOfMeasure?: string | null;
  weightKg?: number | null;
  dimensionsCm?: Product['dimensionsCm'];
  notes?: string | null;
  /**
   * Usuario que realiza la modificación.
   *
   * Nota: en el frontend normalmente se obtiene de la sesión y se rellena
   * automáticamente; por eso aquí es opcional para no forzar a las vistas.
   */
  updatedBy?: UUID;
}

export interface ProductRepository {
  /**
   * Lista productos aplicando filtros básicos y paginación.
   */
  list(
    filters?: ProductFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Product>>;

  /**
   * Lista todos los productos sin paginación (para exportar).
   */
  getAll(filters?: ProductFilters): Promise<Product[]>;

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
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<ProductBatch>>;

  /**
   * Busca un lote por su código o barcode.
   */
  findByBatchCodeOrBarcode(term: string): Promise<ProductBatch | null>;

  /**
   * Verifica si un código de lote ya existe.
   */
  batchCodeExists(batchCode: string): Promise<boolean>;

  /**
   * Crea un nuevo lote.
   */
  createBatch(input: CreateBatchInput): Promise<ProductBatch>;

  /**
   * Actualiza un lote existente.
   */
  updateBatch(batchId: UUID, input: UpdateBatchInput): Promise<ProductBatch>;

  /**
   * Actualiza el estado de un lote.
   */
  updateBatchStatus(
    batchId: UUID,
    status: ProductBatch['status'],
    reason?: string,
  ): Promise<ProductBatch>;

  /**
   * Recupera los reportes de defectos asociados a un lote.
   */
  getDefectReports(batchId: UUID): Promise<BatchDefectReport[]>;

  /**
   * Obtiene todas las ubicaciones de un producto.
   */
  getProductLocations(productId: UUID): Promise<ProductLocation[]>;

  /**
   * Añade una nueva ubicación a un producto.
   */
  addProductLocation(
    productId: UUID,
    warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
    aisle: string,
    shelf: string,
    isPrimary: boolean,
    userId: UUID,
  ): Promise<ProductLocation>;

  /**
   * Elimina una ubicación de un producto.
   */
  removeProductLocation(locationId: UUID, userId: UUID): Promise<void>;

  /**
   * Establece una ubicación como primaria.
   */
  setPrimaryLocation(
    productId: UUID,
    locationId: UUID,
    isPrimary: boolean,
    userId: UUID,
  ): Promise<ProductLocation>;
}
