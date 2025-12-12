import { ArrowDownCircle, ArrowUpCircle, TrendingUp, Calendar } from 'lucide-react';
import * as React from 'react';
import type { InventoryMovement } from '@domain/entities';
import { KPICard } from '../dashboard/KPICard';
import { useLanguage } from '../../context/LanguageContext';

interface MovementStatsCardsProps {
  movements: InventoryMovement[];
}

/**
 * Componente que muestra tarjetas de estadísticas de movimientos.
 *
 * Calcula y muestra:
 * - Total de entradas (movimientos tipo IN)
 * - Total de salidas (movimientos tipo OUT)
 * - Balance neto (entradas - salidas)
 * - Movimientos de hoy
 *
 * @component
 * @param {MovementStatsCardsProps} props - Propiedades del componente
 * @param {InventoryMovement[]} props.movements - Lista de movimientos para calcular estadísticas
 * @example
 * <MovementStatsCards movements={movements} />
 */
export const MovementStatsCards = React.memo(function MovementStatsCards({
  movements,
}: MovementStatsCardsProps) {
  const { t } = useLanguage();

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalEntries = 0;
    let totalExits = 0;
    let todayCount = 0;

    for (const movement of movements) {
      // Contar por tipo
      if (movement.movementType === 'IN') {
        totalEntries += movement.quantity;
      } else if (movement.movementType === 'OUT') {
        totalExits += movement.quantity;
      }

      // Contar movimientos de hoy
      const movementDate = new Date(movement.movementDate);
      movementDate.setHours(0, 0, 0, 0);
      if (movementDate.getTime() === today.getTime()) {
        todayCount++;
      }
    }

    const netBalance = totalEntries - totalExits;

    return {
      totalEntries,
      totalExits,
      netBalance,
      todayCount,
    };
  }, [movements]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Entradas */}
      <KPICard
        title={t('movements.stats.totalEntries')}
        value={stats.totalEntries.toLocaleString('es-ES')}
        icon={<ArrowDownCircle className="h-8 w-8 text-green-600 dark:text-green-400" />}
        accentColor="green"
      />

      {/* Total Salidas */}
      <KPICard
        title={t('movements.stats.totalExits')}
        value={stats.totalExits.toLocaleString('es-ES')}
        icon={<ArrowUpCircle className="h-8 w-8 text-red-600 dark:text-red-400" />}
        accentColor="red"
      />

      {/* Balance Neto */}
      <KPICard
        title={t('movements.stats.netBalance')}
        value={
          stats.netBalance >= 0
            ? `+${stats.netBalance.toLocaleString('es-ES')}`
            : stats.netBalance.toLocaleString('es-ES')
        }
        icon={<TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
        accentColor="blue"
      />

      {/* Movimientos Hoy */}
      <KPICard
        title={t('movements.stats.todayMovements')}
        value={stats.todayCount.toString()}
        icon={<Calendar className="h-8 w-8 text-gray-600 dark:text-gray-400" />}
        accentColor="amber"
      />
    </div>
  );
});
