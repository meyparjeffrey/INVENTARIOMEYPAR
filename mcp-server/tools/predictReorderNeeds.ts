/**
 * Tool MCP para predecir necesidades de reposición.
 *
 * Analiza el consumo histórico y predice qué productos necesitarán reposición.
 *
 * @module mcp-server/tools/predictReorderNeeds
 */

import { mcpSupabaseClient } from '../index';

export interface ReorderPrediction {
  product_id: string;
  product_code: string;
  product_name: string;
  current_stock: number;
  stock_min: number;
  avg_daily_consumption: number;
  days_until_min: number;
  suggested_reorder_qty: number;
  confidence: number;
  preferred_supplier?: {
    id: string;
    name: string;
    lead_time_days: number;
  };
}

/**
 * Predice qué productos necesitarán reposición en los próximos días.
 *
 * @param days_ahead - Días de antelación para la predicción (por defecto: 7)
 * @returns Lista de predicciones de reposición
 */
export async function predictReorderNeeds(
  days_ahead: number = 7,
): Promise<ReorderPrediction[]> {
  // Obtener productos activos
  const { data: products, error: productsError } = await mcpSupabaseClient
    .from('products')
    .select('id, code, name, stock_current, stock_min')
    .eq('is_active', true);

  if (productsError) {
    throw new Error(`Error al obtener productos: ${productsError.message}`);
  }

  if (!products || products.length === 0) {
    return [];
  }

  // Obtener movimientos de salida de los últimos 90 días
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: movements, error: movementsError } = await mcpSupabaseClient
    .from('inventory_movements')
    .select('product_id, quantity, movement_date')
    .eq('movement_type', 'OUT')
    .gte('movement_date', ninetyDaysAgo.toISOString());

  if (movementsError) {
    throw new Error(`Error al obtener movimientos: ${movementsError.message}`);
  }

  // Calcular consumo promedio diario por producto
  const consumptionByProduct = new Map<string, number>();
  (movements ?? []).forEach((movement) => {
    const current = consumptionByProduct.get(movement.product_id) ?? 0;
    consumptionByProduct.set(movement.product_id, current + movement.quantity);
  });

  const daysInPeriod = 90;
  const predictions: ReorderPrediction[] = [];

  // Calcular predicciones para cada producto
  for (const product of products) {
    const totalConsumed = consumptionByProduct.get(product.id) ?? 0;
    const avgDailyConsumption = totalConsumed / daysInPeriod;

    if (avgDailyConsumption > 0) {
      const daysUntilMin =
        (product.stock_current - product.stock_min) / avgDailyConsumption;

      // Solo incluir productos que llegarán al mínimo en los días especificados
      if (daysUntilMin <= days_ahead && daysUntilMin > 0) {
        const suggestedReorderQty = Math.max(
          product.stock_min * 2 - product.stock_current,
          product.stock_min,
        );

        // Calcular confianza basada en cantidad de datos
        const movementCount = (movements ?? []).filter(
          (m) => m.product_id === product.id,
        ).length;
        const confidence = Math.min(movementCount / 10, 1.0);

        // Obtener proveedor preferido si existe
        const { data: productSuppliers } = await mcpSupabaseClient
          .from('product_suppliers')
          .select('supplier_id, is_preferred, suppliers(id, name, lead_time_days)')
          .eq('product_id', product.id)
          .eq('is_preferred', true)
          .limit(1)
          .single();

        let preferredSupplier: ReorderPrediction['preferred_supplier'] | undefined;
        if (productSuppliers && productSuppliers.suppliers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supplier = productSuppliers.suppliers as any;
          preferredSupplier = {
            id: supplier.id,
            name: supplier.name,
            lead_time_days: supplier.lead_time_days ?? 7,
          };
        }

        predictions.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          current_stock: product.stock_current,
          stock_min: product.stock_min,
          avg_daily_consumption: avgDailyConsumption,
          days_until_min: daysUntilMin,
          suggested_reorder_qty: suggestedReorderQty,
          confidence,
          preferred_supplier: preferredSupplier,
        });
      }
    }
  }

  // Ordenar por urgencia (días restantes ASC)
  predictions.sort((a, b) => a.days_until_min - b.days_until_min);

  return predictions;
}
