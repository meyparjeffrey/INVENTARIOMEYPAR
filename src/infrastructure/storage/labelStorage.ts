import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { sanitizeStorageFileName } from './qrStorage';

const PRODUCT_LABEL_BUCKET = 'product-labels';

export type UploadProductLabelInput = {
  productId: string;
  configHash: string;
  pngBlob: Blob;
};

export function buildProductLabelPath(productId: string, configHash: string): string {
  const safeHash = sanitizeStorageFileName(configHash);
  return `${productId}/labels/${safeHash}.png`;
}

export async function uploadProductLabel({
  productId,
  configHash,
  pngBlob,
}: UploadProductLabelInput): Promise<string> {
  const filePath = buildProductLabelPath(productId, configHash);

  const { error } = await supabaseClient.storage
    .from(PRODUCT_LABEL_BUCKET)
    .upload(filePath, pngBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Error al subir etiqueta a Storage: ${error.message}`);
  }

  return filePath;
}
