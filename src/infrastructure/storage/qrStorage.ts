import { supabaseClient } from '@infrastructure/supabase/supabaseClient';

const PRODUCT_QR_BUCKET = 'product-qrs';

export type UploadProductQrInput = {
  productId: string;
  barcode: string;
  pngBlob: Blob;
};

export function buildProductQrPath(productId: string, barcode: string): string {
  // Guardamos por productId para evitar colisiones entre productos,
  // y por barcode para trazabilidad humana.
  return `${productId}/${barcode}.png`;
}

export async function uploadProductQr({
  productId,
  barcode,
  pngBlob,
}: UploadProductQrInput): Promise<string> {
  const filePath = buildProductQrPath(productId, barcode);

  const { error } = await supabaseClient.storage
    .from(PRODUCT_QR_BUCKET)
    .upload(filePath, pngBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Error al subir QR a Storage: ${error.message}`);
  }

  return filePath;
}

export async function deleteProductQr(qrPath: string): Promise<void> {
  const { error } = await supabaseClient.storage.from(PRODUCT_QR_BUCKET).remove([qrPath]);
  if (error) {
    throw new Error(`Error al eliminar QR de Storage: ${error.message}`);
  }
}

export async function createProductQrSignedUrl(
  qrPath: string,
  expiresInSec: number = 60 * 5,
): Promise<string> {
  const { data, error } = await supabaseClient.storage
    .from(PRODUCT_QR_BUCKET)
    .createSignedUrl(qrPath, expiresInSec);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Error al generar Signed URL del QR: ${error?.message ?? 'sin detalle'}`,
    );
  }

  return data.signedUrl;
}
