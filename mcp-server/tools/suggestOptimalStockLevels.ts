/**
 * Tool MCP para sugerir niveles óptimos de stock.
 * 
 * Calcula el stock mínimo óptimo usando EOQ (Economic Order Quantity)
 * y análisis de consumo histórico.
 * 
 * @module mcp-server/tools/suggestOptimalStockLevels
 */

import { mcpSupabaseClient } from '../index';

export interface StockOptimization {
  product_id: string;
  product_code: string;
  product_name: string;
  current_stock_min: number;
  suggested_stock_min: number;
  current_stock_max?: number;
  suggested_stock_max?: number;
  reasoning: string;
  confidence: number;
}

/**
 * Sugiere niveles óptimos de stock para un producto.
 * 
 * @param product_id - ID del producto
 * @returns Sugerencia de optimización de stock
 */
export async function suggestOptimalStockLevels(
  product_id: string
): Promise<StockOptimization | null> {
  // Obtener producto
  const { data: product, error: productError } = await mcpSupabaseClient
    .from('products')
    .select('id, code, name, stock_min, stock_max, cost_price')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    throw new Error(`Error al obtener producto: ${productError?.message}`);
  }

  // Obtener movimientos de salida de los últimos 90 días
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: movements, error: movementsError } = await mcpSupabaseClient
    .from('inventory_movements')
    .select('quantity, movement_date')
    .eq('product_id', product_id)
    .eq('movement_type', 'OUT')
    .gte('movement_date', ninetyDaysAgo.toISOString());

  if (movementsError) {
    throw new Error(`Error al obtener movimientos: ${movementsError.message}`);
  }

  // Calcular consumo promedio diario
  const totalConsumed = (movements ?? []).reduce(
    (sum, m) => sum + m.quantity,
    0
  );
  const daysInPeriod = 90;
  const averageDailyConsumption = totalConsumed / daysInPeriod;

  if (averageDailyConsumption <= 0) {
    return null; // No hay consumo suficiente para calcular
  }

  // Calcular stock mínimo sugerido (30 días de consumo)
  const suggestedStockMin = Math.ceil(averageDailyConsumption * 30);
  const suggestedStockMax = suggestedStockMin * 2;

  // Calcular confianza basada en cantidad de datos
  const movementCount = (movements ?? []).length;
  const confidence = Math.min(movementCount / 10, 1.0);

  // Solo sugerir si hay diferencia significativa
  if (Math.abs(suggestedStockMin - product.stock_min) <= product.stock_min * 0.2) {
    return null; // No hay diferencia significativa
  }

  const reasoning = `Basado en consumo promedio de ${averageDailyConsumption.toFixed(2)} unidades/día en los últimos 90 días. Stock mínimo sugerido para 30 días de cobertura.`;

  return {
    product_id: product.id,
    product_code: product.code,
    product_name: product.name,
    current_stock_min: product.stock_min,
    suggested_stock_min: suggestedStockMin,
    current_stock_max: product.stock_max ?? undefined,
    suggested_stock_max: suggestedStockMax,
    reasoning,
    confidence
  };
}

