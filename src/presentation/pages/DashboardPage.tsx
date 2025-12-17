import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Layers,
  Lightbulb,
  Package,
  RefreshCw,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertList } from '../components/dashboard/AlertList';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { KPICard } from '../components/dashboard/KPICard';
import { MovementsChart } from '../components/dashboard/MovementsChart';
import { MovementsMixChart } from '../components/dashboard/MovementsMixChart';
import { TopProducts } from '../components/dashboard/TopProducts';
import { useDashboard } from '../hooks/useDashboard';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';

/**
 * Página principal del dashboard con métricas avanzadas, valor de inventario y gráficos.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { stats, loading, movementChartData, range, setRange, refresh } = useDashboard();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const rangeLabel =
    range === '7d'
      ? 'últimos 7 días'
      : range === '30d'
        ? 'últimos 30 días'
        : 'últimos 12 meses';

  const totals = React.useMemo(() => {
    return movementChartData.reduce(
      (acc, d) => {
        acc.entries += d.entries;
        acc.exits += d.exits;
        acc.adjustments += d.adjustments;
        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0 },
    );
  }, [movementChartData]);

  return (
    <div className="space-y-6">
      {/* Título con botón de refrescar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Rango del dashboard */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {(
            [
              { key: '7d', label: '7 días' },
              { key: '30d', label: '30 días' },
              { key: '12m', label: '12 meses' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                range === opt.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.movementsChart')} · {rangeLabel}
        </div>
      </div>

      {/* Resumen operativo - Tarjetas grandes (sin precios) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Unidades totales */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm dark:from-gray-800 dark:to-emerald-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.units')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.totalUnits.toLocaleString('es-ES')}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="mr-1 h-4 w-4" />
                {loading ? '...' : stats.totalProducts.toLocaleString('es-ES')}{' '}
                {t('dashboard.products')}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Movimientos hoy */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50 p-6 shadow-sm dark:from-gray-800 dark:to-purple-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.movementsToday')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.movementsToday.toLocaleString('es-ES')}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Layers className="mr-1 h-4 w-4" />
                {loading ? '...' : stats.movementsRange.toLocaleString('es-ES')} (
                {rangeLabel})
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <ArrowUpRight className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Categorías */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50 p-6 shadow-sm dark:from-gray-800 dark:to-orange-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.categories')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.categoriesCount.toLocaleString('es-ES')}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="mr-1 h-4 w-4" />
                {loading ? '...' : stats.totalProducts.toLocaleString('es-ES')}{' '}
                {t('dashboard.products')}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
              <Layers className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* IA */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm dark:from-gray-800 dark:to-blue-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.aiSuggestions')}
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                {loading ? '...' : stats.aiSuggestions.toLocaleString('es-ES')}
              </p>
              <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Lightbulb className="mr-1 h-4 w-4" />
                {t('dashboard.aiSuggestions')}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de alertas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('dashboard.activeProducts')}
          value={loading ? '...' : stats.totalProducts.toLocaleString('es-ES')}
          icon={<Package className="h-8 w-8" />}
          accentColor="green"
          onClick={() => navigate('/products')}
        />
        <KPICard
          title={t('dashboard.lowStockAlerts')}
          value={loading ? '...' : stats.lowStockCount.toString()}
          icon={<AlertTriangle className="h-8 w-8" />}
          accentColor="amber"
          onClick={() => navigate('/alerts')}
        />
        <KPICard
          title={t('dashboard.movementsChart')}
          value={loading ? '...' : stats.movementsRange.toString()}
          icon={<ArrowUpRight className="h-8 w-8" />}
          accentColor="blue"
          onClick={() => navigate('/movements')}
        />
        <KPICard
          title={t('dashboard.aiSuggestions')}
          value={loading ? '...' : stats.aiSuggestions.toString()}
          icon={<Lightbulb className="h-8 w-8" />}
          accentColor="blue"
          onClick={() => navigate('/dashboard?tab=suggestions')}
        />
      </div>

      {/* Sección inferior: gráficas, alertas y actividad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfica de movimientos mejorada */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t('dashboard.movementsChart')}
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                {t('dashboard.entries')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                {t('dashboard.exits')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                {t('dashboard.adjustments')}
              </span>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('dashboard.entries')}
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                {totals.entries.toLocaleString('es-ES')}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('dashboard.exits')}
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                {totals.exits.toLocaleString('es-ES')}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('dashboard.adjustments')}
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-50">
                {totals.adjustments.toLocaleString('es-ES')}
              </div>
            </div>
          </div>
          <MovementsChart data={movementChartData} />
        </div>

        {/* Columna derecha: mix + alertas */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
              Mix ({rangeLabel})
            </h3>
            <MovementsMixChart
              entries={totals.entries}
              exits={totals.exits}
              adjustments={totals.adjustments}
            />
          </div>
          <AlertList />
        </div>
      </div>

      {/* Actividad y Top productos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed />
        <TopProducts period="month" />
      </div>
    </div>
  );
}
