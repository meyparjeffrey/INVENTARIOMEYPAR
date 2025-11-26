import type { Nullable, Timestamp, UUID } from "./common";

export interface Supplier {
  id: UUID;
  code: string;
  name: string;
  contactName?: Nullable<string>;
  contactEmail?: Nullable<string>;
  contactPhone?: Nullable<string>;
  address?: Nullable<string>;
  city?: Nullable<string>;
  country: string;
  taxId?: Nullable<string>;
  paymentTerms?: Nullable<string>;
  leadTimeDays: number;
  qualityRating: number;
  totalBatchesSupplied: number;
  defectiveBatchesCount: number;
  notes?: Nullable<string>;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductSupplier {
  id: UUID;
  productId: UUID;
  supplierId: UUID;
  supplierProductCode?: Nullable<string>;
  costPrice?: Nullable<number>;
  isPreferred: boolean;
  minOrderQuantity: number;
  createdAt: Timestamp;
}

