import { Clock } from 'lucide-react';
import * as React from 'react';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { useRealtime } from '../../hooks/useRealtime';
import { useLanguage } from '../../context/LanguageContext';

interface Activity {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
}

/**
 * Feed de actividad reciente del dashboard.
 */
export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  const { t } = useLanguage();
  const [realActivities, setRealActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  const getTimeAgo = React.useCallback(
    (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('dashboard.time.now');
      if (diffMins < 60) return t('dashboard.time.minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('dashboard.time.hoursAgo', { count: diffHours });
      return t('dashboard.time.daysAgo', { count: diffDays });
    },
    [t],
  );

  const loadActivities = React.useCallback(async () => {
    try {
      // 1) Intentar obtener logs de auditoría recientes
      const { data: auditLogs, error } = await supabaseClient
        .from('audit_logs')
        .select(
          `
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const mappedActivities: Activity[] = (auditLogs ?? []).map((log) => {
        const profile = log.profiles as { first_name: string; last_name: string } | null;
        const userName = profile
          ? `${profile.first_name} ${profile.last_name}`
          : t('dashboard.activity.userFallback');

        let action = '';
        let details = '';

        switch (log.action) {
          case 'CREATE':
            action = t('dashboard.activity.action.create', {
              entity: String(log.entity_type),
            });
            details =
              log.entity_type === 'products'
                ? t('dashboard.activity.productPrefix', {
                    value: String(log.new_value || ''),
                  })
                : '';
            break;
          case 'UPDATE':
            action = t('dashboard.activity.action.update', {
              entity: String(log.entity_type),
            });
            details = log.field_name ? `${log.field_name}: ${log.new_value || ''}` : '';
            break;
          case 'DELETE':
            action = t('dashboard.activity.action.delete', {
              entity: String(log.entity_type),
            });
            break;
          case 'VIEW':
            action = t('dashboard.activity.action.view', {
              entity: String(log.entity_type),
            });
            break;
          default:
            action = `${String(log.action).toLowerCase()} ${log.entity_type}`;
        }

        const timeAgo = getTimeAgo(new Date(log.created_at));

        return {
          id: log.id,
          user: userName,
          action,
          details,
          timestamp: timeAgo,
        };
      });

      if (mappedActivities.length > 0) {
        setRealActivities(mappedActivities);
        return;
      }

      // 2) Si no hay logs de auditoría, usar movimientos recientes como actividad
      const { data: movements, error: movementsError } = await supabaseClient
        .from('inventory_movements')
        .select(
          `
          id,
          movement_type,
          quantity,
          movement_date,
          request_reason,
          comments,
          profiles:user_id (
            first_name,
            last_name
          )
        `,
        )
        .order('movement_date', { ascending: false })
        .limit(5);

      if (movementsError) throw movementsError;

      const movementActivities: Activity[] = (movements ?? []).map((movement) => {
        const profile = movement.profiles as {
          first_name: string;
          last_name: string;
        } | null;
        const userName = profile
          ? `${profile.first_name} ${profile.last_name}`
          : t('dashboard.activity.userFallback');

        let action = '';
        switch (movement.movement_type) {
          case 'IN':
            action = t('dashboard.activity.movement.in');
            break;
          case 'OUT':
            action = t('dashboard.activity.movement.out');
            break;
          case 'ADJUSTMENT':
            action = t('dashboard.activity.movement.adjustment');
            break;
          case 'TRANSFER':
            action = t('dashboard.activity.movement.transfer');
            break;
          default:
            action = t('dashboard.activity.movement.unknown', {
              type: String(movement.movement_type),
            });
        }

        const details =
          movement.comments ||
          movement.request_reason ||
          t('dashboard.activity.quantity', { count: movement.quantity });

        const timeAgo = getTimeAgo(new Date(movement.movement_date));

        return {
          id: movement.id,
          user: userName,
          action,
          details,
          timestamp: timeAgo,
        };
      });

      setRealActivities(movementActivities);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando actividad:', error);
      // Si no hay datos, usar mock
      setRealActivities([
        {
          id: '1',
          user: 'Sistema',
          action: t('dashboard.activity.fallbackAction'),
          details: t('dashboard.activity.fallbackDetails'),
          timestamp: t('dashboard.time.now'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [t, getTimeAgo]);

  React.useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Suscripción en tiempo real para logs de auditoría
  useRealtime({
    table: 'audit_logs',
    onInsert: () => {
      loadActivities();
    },
  });

  const displayActivities = activities.length > 0 ? activities : realActivities;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('dashboard.activity.title')}
        </h3>
      </div>
      <ul className="space-y-3">
        {loading && displayActivities.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.activity.loading')}
          </li>
        ) : displayActivities.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.activity.empty')}
          </li>
        ) : (
          displayActivities.map((activity) => (
            <li
              key={activity.id}
              className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-700"
            >
              <p className="text-sm text-gray-900 dark:text-gray-50">
                <span className="font-semibold">{activity.user}</span> {activity.action}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {activity.details}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {activity.timestamp}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
