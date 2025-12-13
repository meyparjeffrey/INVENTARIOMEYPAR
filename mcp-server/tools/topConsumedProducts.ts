/**
 * Tool MCP para obtener los productos más consumidos.
 *
 * @module mcp-server/tools/topConsumedProducts
 */

import { mcpSupabaseClient } from '../index';

export interface TopConsumedProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  total_consumed: number;
  average_daily: number;
  movement_count: number;
}

/**
 * Obtiene los productos más consumidos en un período.
 *
 * @param period - Período: 'week', 'month', 'quarter'
 * @param limit - Número de productos a retornar (por defecto: 10)
 * @returns Lista de productos más consumidos
 */
export async function topConsumedProducts(
  period: 'week' | 'month' | 'quarter' = 'month',
  limit: number = 10,
): Promise<TopConsumedProduct[]> {
  // Calcular fecha de inicio según período
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
  }

  // Obtener movimientos de salida
  const { data: movements, error: movementsError } = await mcpSupabaseClient
    .from('inventory_movements')
    .select('product_id, quantity')
    .eq('movement_type', 'OUT')
    .gte('movement_date', startDate.toISOString());

  if (movementsError) {
    throw new Error(`Error al obtener movimientos: ${movementsError.message}`);
  }

  // Agrupar por producto
  const consumptionByProduct = new Map<string, { total: number; count: number }>();

  (movements ?? []).forEach((movement) => {
    const current = consumptionByProduct.get(movement.product_id) ?? {
      total: 0,
      count: 0,
    };
    consumptionByProduct.set(movement.product_id, {
      total: current.total + movement.quantity,
      count: current.count + 1,
    });
  });

  // Obtener información de productos
  const productIds = Array.from(consumptionByProduct.keys());
  if (productIds.length === 0) {
    return [];
  }

  const { data: products, error: productsError } = await mcpSupabaseClient
    .from('products')
    .select('id, code, name')
    .in('id', productIds);

  if (productsError) {
    throw new Error(`Error al obtener productos: ${productsError.message}`);
  }

  const productMap = new Map(
    (products ?? []).map((p) => [p.id, { code: p.code, name: p.name }]),
  );

  // Calcular días del período
  const daysInPeriod = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Generar lista de productos consumidos
  const topProducts: TopConsumedProduct[] = Array.from(consumptionByProduct.entries())
    .map(([productId, data]) => {
      const product = productMap.get(productId);
      if (!product) return null;

      return {
        product_id: productId,
        product_code: product.code,
        product_name: product.name,
        total_consumed: data.total,
        average_daily: data.total / daysInPeriod,
        movement_count: data.count,
      };
    })
    .filter((item): item is TopConsumedProduct => item !== null)
    .sort((a, b) => b.total_consumed - a.total_consumed)
    .slice(0, limit);

  return topProducts;
}
