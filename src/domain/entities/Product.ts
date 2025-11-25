export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: string;
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  stockCurrent: number;
  stockMin: number;
  aisle: string;
  shelf: string;
  locationExtra?: string | null;
  costPrice: number;
  purchaseUrl?: string | null;
  imageUrl?: string | null;
  isBatchTracked: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = "OK" | "DEFECTIVE" | "BLOCKED";

export interface ProductBatch {
  id: string;
  productId: string;
  batchCode: string;
  batchBarcode?: string | null;
  quantityTotal: number;
  quantityAvailable: number;
  status: BatchStatus;
  receivedAt: string;
  expiryDate?: string | null;
  notes?: string | null;
  defectiveQty?: number | null;
  updatedAt: string;
}

