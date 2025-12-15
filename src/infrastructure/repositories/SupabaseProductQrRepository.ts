import type { ProductQrAsset } from '@domain/entities';
import { BaseSupabaseRepository } from './BaseSupabaseRepository';

type ProductQrAssetRow = {
  product_id: string;
  barcode: string;
  qr_path: string;
  created_at: string;
  updated_at: string;
};

const mapProductQrAsset = (row: ProductQrAssetRow): ProductQrAsset => ({
  productId: row.product_id,
  barcode: row.barcode,
  qrPath: row.qr_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseProductQrRepository extends BaseSupabaseRepository {
  async getByProductId(productId: string): Promise<ProductQrAsset | null> {
    const { data, error } = await this.client
      .from('product_qr_assets')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    this.handleError('obtener product_qr_assets por product_id', error);
    if (!data) return null;
    return mapProductQrAsset(data as ProductQrAssetRow);
  }

  async getByProductIds(productIds: string[]): Promise<ProductQrAsset[]> {
    if (productIds.length === 0) return [];

    const { data, error } = await this.client
      .from('product_qr_assets')
      .select('*')
      .in('product_id', productIds);

    this.handleError('obtener product_qr_assets por product_ids', error);
    return (data ?? []).map((row) => mapProductQrAsset(row as ProductQrAssetRow));
  }

  async upsert(input: {
    productId: string;
    barcode: string;
    qrPath: string;
  }): Promise<ProductQrAsset> {
    const { data, error } = await this.client
      .from('product_qr_assets')
      .upsert(
        {
          product_id: input.productId,
          barcode: input.barcode,
          qr_path: input.qrPath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id' },
      )
      .select('*')
      .single();

    this.handleError('upsert product_qr_assets', error);
    return mapProductQrAsset(data as ProductQrAssetRow);
  }

  async deleteByProductId(productId: string): Promise<void> {
    const { error } = await this.client
      .from('product_qr_assets')
      .delete()
      .eq('product_id', productId);

    this.handleError('delete product_qr_assets', error);
  }
}
