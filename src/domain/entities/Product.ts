import type { Nullable, Timestamp, UUID } from './common';

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

/**
 * Ubicación de un producto en el almacén.
 *
 * Permite que un producto tenga múltiples ubicaciones (ej: A1, A2, B3).
 * Una ubicación está compuesta por aisle (pasillo/estantería) y shelf (estante).
 * Incluye la cantidad de stock en esa ubicación específica.
 *
 * Nota: Para MEYPAR, todas las ubicaciones suman su stock al total (no se diferencia).
 * Para OLIVA_TORRAS y FURGONETA, cada ubicación tiene su stock individual.
 */
export interface ProductLocation {
  id: UUID;
  productId: UUID;
  warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  aisle: string;
  shelf: string;
  quantity: number;
  isPrimary: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: Nullable<UUID>;
  updatedBy?: Nullable<UUID>;
}

/**
 * Stock de un producto en un almacén específico.
 */
export interface ProductStockByWarehouse {
  id: UUID;
  productId: UUID;
  warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  quantity: number;
  locationAisle?: Nullable<string>;
  locationShelf?: Nullable<string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: Nullable<UUID>;
  updatedBy?: Nullable<UUID>;
}

export interface Product {
  id: UUID;
  code: string;
  barcode?: Nullable<string>;
  name: string;
  description?: Nullable<string>;
  category?: Nullable<string>;
  stockCurrent: number; // Suma calculada de todos los almacenes
  stockMin: number;
  stockMax?: Nullable<number>;
  aisle: string; // Mantener para compatibilidad (ubicación primaria)
  shelf: string; // Mantener para compatibilidad (ubicación primaria)
  locations?: ProductLocation[]; // Múltiples ubicaciones
  locationExtra?: Nullable<string>;
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Mantener para compatibilidad (almacén primario)
  stocksByWarehouse?: ProductStockByWarehouse[]; // Stock por almacén
  costPrice: number;
  salePrice?: Nullable<number>;
  purchaseUrl?: Nullable<string>;
  imageUrl?: Nullable<string>;
  supplierCode?: Nullable<string>; // Código de Proveedor
  isActive: boolean;
  isBatchTracked: boolean;
  unitOfMeasure?: Nullable<string>;
  weightKg?: Nullable<number>;
  dimensionsCm?: Nullable<ProductDimensions>;
  notes?: Nullable<string>;
  createdAt: Timestamp;
  updatedAt: Timestamp; // Fecha de modificación
  createdBy?: Nullable<UUID>;
  updatedBy?: Nullable<UUID>; // Usuario que hizo la modificación
  createdByProfile?: {
    firstName: string | null;
    lastName: string | null;
  };
  updatedByProfile?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export type BatchStatus = 'OK' | 'DEFECTIVE' | 'BLOCKED' | 'CONSUMED' | 'EXPIRED';

export interface ProductBatch {
  id: UUID;
  productId: UUID;
  supplierId?: Nullable<UUID>;
  batchCode: string;
  batchBarcode?: Nullable<string>;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved: number;
  defectiveQty: number;
  status: BatchStatus;
  blockedReason?: Nullable<string>;
  qualityScore: number;
  receivedAt: Timestamp;
  expiryDate?: Nullable<string>;
  manufactureDate?: Nullable<string>;
  costPerUnit?: Nullable<number>;
  locationOverride?: Nullable<string>;
  notes?: Nullable<string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: Nullable<UUID>;
}

export type DefectType =
  | 'DAMAGED'
  | 'EXPIRED'
  | 'WRONG_SPEC'
  | 'CONTAMINATED'
  | 'MISSING_PARTS'
  | 'PACKAGING_ISSUE'
  | 'OTHER';

export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DefectResolutionStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'RETURNED_TO_SUPPLIER';

export interface BatchDefectReport {
  id: UUID;
  batchId: UUID;
  reportedBy?: Nullable<UUID>;
  defectType: DefectType;
  affectedQuantity: number;
  severity: DefectSeverity;
  description?: Nullable<string>;
  images: string[];
  resolutionStatus: DefectResolutionStatus;
  resolutionNotes?: Nullable<string>;
  resolvedAt?: Nullable<Timestamp>;
  resolvedBy?: Nullable<UUID>;
  createdAt: Timestamp;
}
