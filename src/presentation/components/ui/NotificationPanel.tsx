import { Bell } from 'lucide-react';
import * as React from 'react';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { Button } from './Button';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { useRealtime } from '../../hooks/useRealtime';

interface Notification {
  id: string;
  type: 'suggestion' | 'stock' | 'batch';
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  read: boolean;
}

interface NotificationPanelProps {
  count?: number;
  className?: string;
}

/**
 * Panel de notificaciones con dropdown.
 */
export function NotificationPanel({ className }: NotificationPanelProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const loadNotifications = React.useCallback(async () => {
    try {
      // Obtener sugerencias IA pendientes
      const { data: suggestions } = await supabaseClient
        .from('ai_suggestions')
        .select('*')
        .eq('status', 'PENDING')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      // Obtener productos con stock bajo (usando SQL directo)
      const { data: products } = await supabaseClient
        .from('products')
        .select('id, code, name, stock_current, stock_min')
        .eq('is_active', true)
        .limit(100); // Obtener más y filtrar en cliente

      const lowStockProducts = (products ?? [])
        .filter((p) => p.stock_current <= p.stock_min)
        .slice(0, 5);

      const allNotifications: Notification[] = [];

      // Agregar sugerencias
      suggestions?.forEach((s) => {
        allNotifications.push({
          id: `suggestion-${s.id}`,
          type: 'suggestion',
          title: s.title,
          description: s.description,
          priority: s.priority,
          createdAt: s.created_at,
          read: false,
        });
      });

      // Agregar alertas de stock
      lowStockProducts.forEach((p) => {
        allNotifications.push({
          id: `stock-${p.id}`,
          type: 'stock',
          title: `Stock bajo: ${p.name}`,
          description: `Quedan ${p.stock_current} unidades. Stock mínimo: ${p.stock_min}`,
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          read: false,
        });
      });

      // Ordenar por prioridad y fecha
      allNotifications.sort((a, b) => {
        const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aPriority = priorityOrder[a.priority ?? 'LOW'];
        const bPriority = priorityOrder[b.priority ?? 'LOW'];
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotifications(allNotifications);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Suscripciones en tiempo real
  useRealtime({
    table: 'ai_suggestions',
    onInsert: () => loadNotifications(),
    onUpdate: () => loadNotifications(),
    onDelete: () => loadNotifications(),
  });

  useRealtime({
    table: 'products',
    onUpdate: () => loadNotifications(), // Cuando cambie el stock de un producto
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Cerrar al hacer click fuera (robusto ante z-index/overlays)
  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // Si el click es dentro del panel o del botón, no cerrar
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;

      setIsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 p-0"
        title={
          unreadCount > 0
            ? `${unreadCount} ${t('notifications.title').toLowerCase()}`
            : t('notifications.title')
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Notificaciones</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            ref={panelRef}
            className="absolute right-0 top-full z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {t('notifications.title')}
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {unreadCount} {t('notifications.unread')}
                  </span>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('notifications.loading')}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('notifications.empty')}
                </div>
              ) : (
                <ul className="py-1">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Navegar a la notificación o marcarla como leída
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition',
                          !notification.read && 'bg-primary-50 dark:bg-primary-900/20',
                          'hover:bg-gray-100 dark:hover:bg-gray-700',
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {notification.type === 'suggestion' && (
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                          {notification.type === 'stock' && (
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                          )}
                          {notification.type === 'batch' && (
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-50">
                            {notification.title}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {notification.description}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {new Date(notification.createdAt).toLocaleDateString(
                              'es-ES',
                              {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                <button
                  type="button"
                  className="w-full text-center text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  onClick={() => setIsOpen(false)}
                >
                  {t('notifications.viewAll')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
