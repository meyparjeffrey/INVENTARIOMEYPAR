import type { ProductLabelAsset } from '@domain/entities';
import { BaseSupabaseRepository } from './BaseSupabaseRepository';

type ProductLabelAssetRow = {
  id: string;
  product_id: string;
  label_path: string;
  config_hash: string;
  config_json: Record<string, unknown>;
  created_at: string;
};

const mapProductLabelAsset = (row: ProductLabelAssetRow): ProductLabelAsset => ({
  id: row.id,
  productId: row.product_id,
  labelPath: row.label_path,
  configHash: row.config_hash,
  configJson: row.config_json ?? {},
  createdAt: row.created_at,
});

export class SupabaseProductLabelRepository extends BaseSupabaseRepository {
  async getLatestByProductIds(productIds: string[]): Promise<ProductLabelAsset[]> {
    if (productIds.length === 0) return [];

    const { data, error } = await this.client
      .from('product_label_assets')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    this.handleError('obtener product_label_assets por product_ids', error);

    const latestByProductId = new Map<string, ProductLabelAsset>();
    for (const row of data ?? []) {
      const mapped = mapProductLabelAsset(row as ProductLabelAssetRow);
      if (!latestByProductId.has(mapped.productId)) {
        latestByProductId.set(mapped.productId, mapped);
      }
    }
    return Array.from(latestByProductId.values());
  }

  async upsert(input: {
    productId: string;
    labelPath: string;
    configHash: string;
    configJson: Record<string, unknown>;
  }): Promise<ProductLabelAsset> {
    const { data, error } = await this.client
      .from('product_label_assets')
      .insert({
        product_id: input.productId,
        label_path: input.labelPath,
        config_hash: input.configHash,
        config_json: input.configJson,
      })
      .select('*')
      .single();

    this.handleError('insert product_label_assets', error);
    return mapProductLabelAsset(data as ProductLabelAssetRow);
  }
}
