/**
 * Tool MCP para detectar anomalías en lotes.
 *
 * Identifica lotes con comportamiento anormal: alta tasa de defectos,
 * consumo anormal, próximos a caducar, bloqueados por mucho tiempo.
 *
 * @module mcp-server/tools/detectBatchAnomalies
 */

import { mcpSupabaseClient } from '../index';

export interface BatchAnomaly {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  anomaly_type:
    | 'HIGH_DEFECT_RATE'
    | 'ABNORMAL_CONSUMPTION'
    | 'EXPIRING_SOON'
    | 'BLOCKED_TOO_LONG';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detected_at: string;
}

/**
 * Detecta anomalías en lotes.
 *
 * @returns Lista de anomalías detectadas
 */
export async function detectBatchAnomalies(): Promise<BatchAnomaly[]> {
  const anomalies: BatchAnomaly[] = [];

  // 1. Detectar lotes defectuosos con alta tasa de defectos
  const { data: defectiveBatches, error: defectiveError } = await mcpSupabaseClient
    .from('product_batches')
    .select(
      `
      id,
      batch_code,
      product_id,
      quantity_total,
      defective_qty,
      status,
      products!product_batches_product_id_fkey(code, name)
    `,
    )
    .eq('status', 'DEFECTIVE');

  if (!defectiveError && defectiveBatches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defectiveBatches.forEach((batch: any) => {
      const defectRate = batch.defective_qty / batch.quantity_total;
      if (defectRate > 0.5) {
        anomalies.push({
          batch_id: batch.id,
          batch_code: batch.batch_code,
          product_id: batch.product_id,
          product_code: batch.products?.code ?? '',
          product_name: batch.products?.name ?? '',
          anomaly_type: 'HIGH_DEFECT_RATE',
          severity: defectRate > 0.8 ? 'CRITICAL' : 'HIGH',
          description: `Lote con ${(defectRate * 100).toFixed(1)}% de unidades defectuosas (${batch.defective_qty} de ${batch.quantity_total})`,
          detected_at: new Date().toISOString(),
        });
      }
    });
  }

  // 2. Detectar lotes bloqueados por mucho tiempo
  const { data: blockedBatches, error: blockedError } = await mcpSupabaseClient
    .from('product_batches')
    .select(
      `
      id,
      batch_code,
      product_id,
      status,
      updated_at,
      blocked_reason,
      products!product_batches_product_id_fkey(code, name)
    `,
    )
    .eq('status', 'BLOCKED');

  if (!blockedError && blockedBatches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockedBatches.forEach((batch: any) => {
      const blockedDate = new Date(batch.updated_at);
      const daysBlocked = Math.ceil(
        (Date.now() - blockedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysBlocked > 7) {
        anomalies.push({
          batch_id: batch.id,
          batch_code: batch.batch_code,
          product_id: batch.product_id,
          product_code: batch.products?.code ?? '',
          product_name: batch.products?.name ?? '',
          anomaly_type: 'BLOCKED_TOO_LONG',
          severity: daysBlocked > 30 ? 'CRITICAL' : daysBlocked > 14 ? 'HIGH' : 'MEDIUM',
          description: `Lote bloqueado hace ${daysBlocked} días: ${batch.blocked_reason ?? 'Sin motivo especificado'}`,
          detected_at: new Date().toISOString(),
        });
      }
    });
  }

  // 3. Detectar lotes próximos a caducar
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: expiringBatches, error: expiringError } = await mcpSupabaseClient
    .from('product_batches')
    .select(
      `
      id,
      batch_code,
      product_id,
      expiry_date,
      status,
      products!product_batches_product_id_fkey(code, name)
    `,
    )
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
    .eq('status', 'OK');

  if (!expiringError && expiringBatches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiringBatches.forEach((batch: any) => {
      const expiryDate = new Date(batch.expiry_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilExpiry <= 30) {
        anomalies.push({
          batch_id: batch.id,
          batch_code: batch.batch_code,
          product_id: batch.product_id,
          product_code: batch.products?.code ?? '',
          product_name: batch.products?.name ?? '',
          anomaly_type: 'EXPIRING_SOON',
          severity:
            daysUntilExpiry <= 7 ? 'CRITICAL' : daysUntilExpiry <= 14 ? 'HIGH' : 'MEDIUM',
          description: `Lote caduca en ${daysUntilExpiry} días`,
          detected_at: new Date().toISOString(),
        });
      }
    });
  }

  // 4. Detectar consumo anormal (requiere análisis de movimientos)
  // Esto se puede implementar comparando consumo actual vs histórico

  return anomalies;
}
