import * as React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "../../hooks/useRealtime";
import { useLanguage } from "../../context/LanguageContext";
import type { MovementChartData } from "../../hooks/useDashboard";

interface MovementDataLegacy {
  date: string;
  entradas: number;
  salidas: number;
  ajustes: number;
}

interface MovementsChartProps {
  data?: MovementChartData[];
}

/**
 * Gráfica de movimientos de los últimos 7 días.
 * Acepta datos externos o carga los suyos propios.
 */
export function MovementsChart({ data: externalData }: MovementsChartProps) {
  const { t } = useLanguage();
  const [data, setData] = React.useState<MovementDataLegacy[]>([]);
  const [loading, setLoading] = React.useState(!externalData);
  const [chartType, setChartType] = React.useState<"area" | "bar">("area");

  // Convertir datos externos al formato interno
  React.useEffect(() => {
    if (externalData) {
      const convertedData: MovementDataLegacy[] = externalData.map((d) => ({
        date: d.date,
        entradas: d.entries,
        salidas: d.exits,
        ajustes: d.adjustments
      }));
      setData(convertedData);
      setLoading(false);
    }
  }, [externalData]);

  const loadMovements = React.useCallback(async () => {
    if (externalData) return; // No cargar si hay datos externos

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: movements, error } = await supabaseClient
        .from("inventory_movements")
        .select("movement_type, quantity, movement_date")
        .gte("movement_date", sevenDaysAgo.toISOString())
        .order("movement_date", { ascending: true });

      if (error) throw error;

      const dateMap = new Map<string, { entradas: number; salidas: number; ajustes: number }>();

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        dateMap.set(dateKey, { entradas: 0, salidas: 0, ajustes: 0 });
      }

      movements?.forEach((movement) => {
        const date = new Date(movement.movement_date);
        const dateKey = date.toISOString().split("T")[0];
        const existing = dateMap.get(dateKey);

        if (existing) {
          if (movement.movement_type === "IN") {
            existing.entradas += movement.quantity;
          } else if (movement.movement_type === "OUT") {
            existing.salidas += movement.quantity;
          } else if (movement.movement_type === "ADJUSTMENT") {
            existing.ajustes += Math.abs(movement.quantity);
          }
        }
      });

      const chartData: MovementDataLegacy[] = Array.from(dateMap.entries()).map(
        ([date, values]) => ({
          date: new Date(date).toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric"
          }),
          entradas: values.entradas,
          salidas: values.salidas,
          ajustes: values.ajustes
        })
      );

      setData(chartData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error cargando movimientos:", error);
    } finally {
      setLoading(false);
    }
  }, [externalData]);

  React.useEffect(() => {
    if (!externalData) {
      loadMovements();
    }
  }, [loadMovements, externalData]);

  useRealtime({
    table: "inventory_movements",
    onInsert: () => {
      if (!externalData) loadMovements();
    }
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  // Mostrar mensaje solo si realmente no hay puntos de datos (ni entradas, ni salidas, ni ajustes)
  if (
    data.length === 0 ||
    data.every((d) => d.entradas === 0 && d.salidas === 0 && d.ajustes === 0)
  ) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
        <p>{t("dashboard.noData")}</p>
      </div>
    );
  }

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Toggle tipo de gráfico */}
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setChartType("area")}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            chartType === "area"
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Área
        </button>
        <button
          onClick={() => setChartType("bar")}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            chartType === "bar"
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Barras
        </button>
      </div>

      <ResponsiveContainer width="100%" height={256}>
        {chartType === "area" ? (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAjustes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis 
              className="text-xs" 
              tick={{ fill: "#9ca3af", fontSize: 11 }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="entradas"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEntradas)"
              name={t("dashboard.entries")}
            />
            <Area
              type="monotone"
              dataKey="salidas"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSalidas)"
              name={t("dashboard.exits")}
            />
            <Area
              type="monotone"
              dataKey="ajustes"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAjustes)"
              name={t("dashboard.adjustments")}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis 
              className="text-xs" 
              tick={{ fill: "#9ca3af", fontSize: 11 }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="entradas" 
              fill="#10b981" 
              name={t("dashboard.entries")}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="salidas" 
              fill="#ef4444" 
              name={t("dashboard.exits")}
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="ajustes" 
              fill="#3b82f6" 
              name={t("dashboard.adjustments")}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

