import * as React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

interface MovementData {
  date: string;
  entradas: number;
  salidas: number;
}

/**
 * Gráfica de movimientos de los últimos 7 días.
 */
export function MovementsChart() {
  const [data, setData] = React.useState<MovementData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadMovements() {
      try {
        // Obtener movimientos de los últimos 7 días
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: movements, error } = await supabaseClient
          .from("inventory_movements")
          .select("movement_type, quantity, movement_date")
          .gte("movement_date", sevenDaysAgo.toISOString())
          .order("movement_date", { ascending: true });

        if (error) throw error;

        // Agrupar por fecha
        const dateMap = new Map<string, { entradas: number; salidas: number }>();

        // Inicializar últimos 7 días
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split("T")[0];
          dateMap.set(dateKey, { entradas: 0, salidas: 0 });
        }

        // Agregar movimientos
        movements?.forEach((movement) => {
          const date = new Date(movement.movement_date);
          const dateKey = date.toISOString().split("T")[0];
          const existing = dateMap.get(dateKey);

          if (existing) {
            if (movement.movement_type === "IN") {
              existing.entradas += movement.quantity;
            } else if (movement.movement_type === "OUT") {
              existing.salidas += movement.quantity;
            }
          }
        });

        // Convertir a array y formatear fechas
        const chartData: MovementData[] = Array.from(dateMap.entries())
          .map(([date, values]) => ({
            date: new Date(date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
            entradas: values.entradas,
            salidas: values.salidas
          }));

        setData(chartData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error cargando movimientos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMovements();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
        <p>Cargando gráfica...</p>
      </div>
    );
  }

  if (data.length === 0 || data.every((d) => d.entradas === 0 && d.salidas === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
        <p>No hay movimientos en los últimos 7 días</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "currentColor" }}
          stroke="currentColor"
        />
        <YAxis className="text-xs" tick={{ fill: "currentColor" }} stroke="currentColor" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--gray-800)",
            border: "1px solid var(--gray-700)",
            borderRadius: "0.5rem"
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="entradas"
          stroke="#10b981"
          strokeWidth={2}
          name="Entradas"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="salidas"
          stroke="#ef4444"
          strokeWidth={2}
          name="Salidas"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

