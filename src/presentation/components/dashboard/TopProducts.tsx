import * as React from "react";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "../../hooks/useRealtime";

interface TopProduct {
  productId: string;
  productCode: string;
  productName: string;
  totalQuantity: number;
}

interface TopProductsProps {
  period?: "month" | "quarter" | "year";
}

/**
 * Componente que muestra los top productos más consumidos.
 */
export function TopProducts({ period: initialPeriod = "month" }: TopProductsProps) {
  const [period, setPeriod] = React.useState<"month" | "quarter" | "year">(initialPeriod);
  const [products, setProducts] = React.useState<TopProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadTopProducts = React.useCallback(async () => {
    try {
      // Calcular fecha de inicio según período
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Obtener top productos consumidos (movimientos OUT)
      const { data: movements, error } = await supabaseClient
        .from("inventory_movements")
        .select(`
          product_id,
          quantity,
          products:product_id (
            code,
            name
          )
        `)
        .eq("movement_type", "OUT")
        .gte("movement_date", startDate.toISOString())
        .order("movement_date", { ascending: false });

      if (error) throw error;

      // Agrupar por producto y sumar cantidades
      const productMap = new Map<string, TopProduct>();

      movements?.forEach((movement) => {
        const product = movement.products as { code: string; name: string } | null;
        if (!product) return;

        const productId = movement.product_id as string;
        const existing = productMap.get(productId);

        if (existing) {
          existing.totalQuantity += movement.quantity;
        } else {
          productMap.set(productId, {
            productId,
            productCode: product.code,
            productName: product.name,
            totalQuantity: movement.quantity
          });
        }
      });

      // Ordenar por cantidad y tomar top 5
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      setProducts(topProducts);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error cargando top productos:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    loadTopProducts();
  }, [loadTopProducts]);

  // Suscripción en tiempo real para movimientos
  useRealtime({
    table: "inventory_movements",
    onInsert: () => {
      loadTopProducts();
    }
  });

  React.useEffect(() => {
    setPeriod(initialPeriod);
  }, [initialPeriod]);

  const maxQuantity = products.length > 0 ? Math.max(...products.map((p) => p.totalQuantity)) : 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Top Productos Consumidos
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "month" | "quarter" | "year")}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="month">Este mes</option>
          <option value="quarter">Este trimestre</option>
          <option value="year">Este año</option>
        </select>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No hay movimientos en este período
          </div>
        ) : (
          products.map((product, index) => (
            <div key={product.productId} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {index + 1}. {product.productName}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${(product.totalQuantity / maxQuantity) * 100}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-gray-50">{product.totalQuantity} uds</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

