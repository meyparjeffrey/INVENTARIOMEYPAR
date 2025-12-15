import type { Timestamp, UUID } from './common';

export interface ProductQrAsset {
  productId: UUID;
  barcode: string;
  qrPath: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
