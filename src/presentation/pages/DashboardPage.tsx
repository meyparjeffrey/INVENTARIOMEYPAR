import { AlertTriangle, Lightbulb, Package } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertList } from "../components/dashboard/AlertList";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { KPICard } from "../components/dashboard/KPICard";
import { MovementsChart } from "../components/dashboard/MovementsChart";
import { TopProducts } from "../components/dashboard/TopProducts";
import { useDashboard } from "../hooks/useDashboard";

/**
 * Página principal del dashboard con tarjetas KPI, alertas y actividad.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { stats, loading } = useDashboard();

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Hoy: {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Productos activos"
          value={loading ? "..." : stats.totalProducts.toLocaleString("es-ES")}
          icon={<Package className="h-8 w-8" />}
          accentColor="green"
          onClick={() => navigate("/products")}
        />
        <KPICard
          title="En alarma de stock"
          value={loading ? "..." : stats.lowStockCount.toString()}
          icon={<AlertTriangle className="h-8 w-8" />}
          accentColor="amber"
          onClick={() => navigate("/alerts")}
        />
        <KPICard
          title="Lotes críticos"
          value={loading ? "..." : stats.criticalBatches.toString()}
          icon={<AlertTriangle className="h-8 w-8" />}
          accentColor="red"
          onClick={() => navigate("/batches?status=critical")}
        />
        <KPICard
          title="Sugerencias IA"
          value={loading ? "..." : stats.aiSuggestions.toString()}
          icon={<Lightbulb className="h-8 w-8" />}
          accentColor="blue"
          onClick={() => navigate("/dashboard?tab=suggestions")}
        />
      </div>

      {/* Sección inferior: gráficas, alertas y actividad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfica de movimientos */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Movimientos últimos 7 días
          </h3>
          <MovementsChart />
        </div>

        {/* Alertas */}
        <AlertList />
      </div>

      {/* Actividad y Top productos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed />
        <TopProducts period="month" />
      </div>
    </div>
  );
}

