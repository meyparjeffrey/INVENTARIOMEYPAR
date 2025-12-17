import { AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { useRealtime } from '../../hooks/useRealtime';
import { useLanguage } from '../../context/LanguageContext';

interface Alert {
  id: string;
  type: 'stock' | 'batch' | 'suggestion';
  title: string;
  description: string;
  timestamp: string;
}

interface AlertListProps {
  alerts?: Alert[];
  onViewAll?: () => void;
}

/**
 * Lista de alertas recientes del dashboard.
 */
export function AlertList({ alerts = [], onViewAll }: AlertListProps) {
  const { t } = useLanguage();
  const [realAlerts, setRealAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadAlerts = React.useCallback(async () => {
    try {
      const allAlerts: Alert[] = [];

      // Obtener productos con stock bajo (alarma) de toda la tabla
      // Para mantener un rendimiento razonable en dashboard, limitamos a 500 filas y luego filtramos en cliente
      const { data: products, error: productsError } = await supabaseClient
        .from('products')
        .select('id, name, unit_of_measure, stock_current, stock_min')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(500);

      if (productsError) throw productsError;

      const lowStockProducts = (products ?? [])
        .filter((p) => p.stock_current <= p.stock_min)
        .slice(0, 3);

      lowStockProducts.forEach((product) => {
        const unit = product.unit_of_measure ?? t('common.unitsAbbrev');
        allAlerts.push({
          id: `stock-${product.id}`,
          type: 'stock',
          title: t('dashboard.alerts.stockLowTitle', { name: product.name }),
          description: t('dashboard.alerts.stockLowDesc', {
            current: product.stock_current,
            unit,
            min: product.stock_min,
          }),
          timestamp: t('dashboard.time.now'),
        });
      });

      // Obtener sugerencias IA pendientes
      const { data: suggestions } = await supabaseClient
        .from('ai_suggestions')
        .select('*')
        .eq('status', 'PENDING')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (suggestions) {
        suggestions.forEach((suggestion) => {
          allAlerts.push({
            id: `suggestion-${suggestion.id}`,
            type: 'suggestion',
            title: suggestion.title,
            description: suggestion.description,
            timestamp: new Date(suggestion.created_at).toLocaleDateString('es-ES'),
          });
        });
      }

      setRealAlerts(allAlerts.slice(0, 5)); // Máximo 5 alertas
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando alertas:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Suscripción en tiempo real para productos (cuando cambie el stock)
  useRealtime({
    table: 'products',
    onUpdate: () => {
      loadAlerts();
    },
  });

  // Suscripción en tiempo real para sugerencias IA
  useRealtime({
    table: 'ai_suggestions',
    onInsert: () => loadAlerts(),
    onUpdate: () => loadAlerts(),
    onDelete: () => loadAlerts(),
  });

  const displayAlerts = alerts.length > 0 ? alerts : realAlerts;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('dashboard.alerts.title')}
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {t('dashboard.alerts.viewAll')} →
          </button>
        )}
      </div>
      <ul className="space-y-3">
        {loading && displayAlerts.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.alerts.loading')}
          </li>
        ) : displayAlerts.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.alerts.empty')}
          </li>
        ) : (
          displayAlerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {alert.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {alert.description}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
