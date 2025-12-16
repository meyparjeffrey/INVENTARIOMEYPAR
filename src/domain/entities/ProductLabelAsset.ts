export interface ProductLabelAsset {
  id: string;
  productId: string;
  labelPath: string;
  configHash: string;
  configJson: Record<string, unknown>;
  createdAt: string;
}
