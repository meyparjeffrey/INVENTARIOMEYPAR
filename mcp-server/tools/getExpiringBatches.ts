/**
 * Tool MCP para obtener lotes próximos a caducar.
 * 
 * @module mcp-server/tools/getExpiringBatches
 */

import { mcpSupabaseClient } from '../index';

export interface ExpiringBatch {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity_available: number;
  is_urgent: boolean;
}

/**
 * Obtiene lotes que caducan en los próximos días.
 * 
 * @param days - Días de antelación para considerar próximo a caducar (por defecto: 30)
 * @returns Lista de lotes próximos a caducar
 */
export async function getExpiringBatches(
  days: number = 30
): Promise<ExpiringBatch[]> {
  // Calcular fecha límite
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + days);

  // Obtener lotes con fecha de caducidad
  const { data: batches, error: batchesError } = await mcpSupabaseClient
    .from('product_batches')
    .select(`
      id,
      batch_code,
      product_id,
      expiry_date,
      quantity_available,
      status,
      products!product_batches_product_id_fkey(code, name)
    `)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', limitDate.toISOString().split('T')[0])
    .eq('status', 'OK');

  if (batchesError) {
    throw new Error(`Error al obtener lotes: ${batchesError.message}`);
  }

  if (!batches || batches.length === 0) {
    return [];
  }

  const now = new Date();
  const expiringBatches: ExpiringBatch[] = batches.map((batch: any) => {
    const expiryDate = new Date(batch.expiry_date);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      batch_id: batch.id,
      batch_code: batch.batch_code,
      product_id: batch.product_id,
      product_code: batch.products?.code ?? '',
      product_name: batch.products?.name ?? '',
      expiry_date: batch.expiry_date,
      days_until_expiry: daysUntilExpiry,
      quantity_available: batch.quantity_available,
      is_urgent: daysUntilExpiry <= 7
    };
  });

  // Ordenar por días hasta caducidad (ASC)
  expiringBatches.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  return expiringBatches;
}

