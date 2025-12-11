import type { Nullable, Timestamp, UUID } from "./common";

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Product {
  id: UUID;
  code: string;
  barcode?: Nullable<string>;
  name: string;
  description?: Nullable<string>;
  category?: Nullable<string>;
  stockCurrent: number;
  stockMin: number;
  stockMax?: Nullable<number>;
  aisle: string;
  shelf: string;
  locationExtra?: Nullable<string>;
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

export type BatchStatus =
  | "OK"
  | "DEFECTIVE"
  | "BLOCKED"
  | "CONSUMED"
  | "EXPIRED";

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
  | "DAMAGED"
  | "EXPIRED"
  | "WRONG_SPEC"
  | "CONTAMINATED"
  | "MISSING_PARTS"
  | "PACKAGING_ISSUE"
  | "OTHER";

export type DefectSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DefectResolutionStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | "RETURNED_TO_SUPPLIER";

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
