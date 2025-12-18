import { Filter, X, Calendar, Info } from 'lucide-react';
import * as React from 'react';
import type { MovementFilters as Filters } from '@domain/repositories/InventoryMovementRepository';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLanguage } from '../../context/LanguageContext';

interface MovementFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

type MovementTypeOption =
  | 'IN'
  | 'OUT'
  | 'TRANSFER'
  | 'ADJUSTMENT_CODE'
  | 'ADJUSTMENT_NAME'
  | 'ADJUSTMENT_DESCRIPTION';

/**
 * Componente de filtros para movimientos.
 */
export function MovementFilters({ filters, onFiltersChange }: MovementFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters);
  const [selectedTypeInfo, setSelectedTypeInfo] = React.useState<string | null>(null);

  // Sincronizar con filtros externos (solo cuando cambian realmente)
  React.useEffect(() => {
    // Comparar objetos para evitar loops infinitos
    const filtersStr = JSON.stringify(filters);
    const localFiltersStr = JSON.stringify(localFilters);
    if (filtersStr !== localFiltersStr) {
      setLocalFilters(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: Filters = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
    setSelectedTypeInfo(null);
  };

  const hasActiveFilters =
    filters.movementType ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.adjustmentType ||
    filters.warehouse;

  const movementTypes: {
    value: MovementTypeOption;
    label: string;
    description: string;
    movementType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
    adjustmentType?: 'CODE' | 'NAME' | 'DESCRIPTION';
  }[] = [
    {
      value: 'IN',
      label: 'Stock in',
      description: t('movements.filter.stockInDesc'),
      movementType: 'IN',
    },
    {
      value: 'OUT',
      label: 'Stock out',
      description: t('movements.filter.stockOutDesc'),
      movementType: 'OUT',
    },
    {
      value: 'TRANSFER',
      label: 'Ubicación',
      description: t('movements.filter.locationDesc'),
      movementType: 'TRANSFER',
    },
    {
      value: 'ADJUSTMENT_CODE',
      label: 'Código',
      description: t('movements.filter.codeDesc'),
      movementType: 'ADJUSTMENT',
      adjustmentType: 'CODE',
    },
    {
      value: 'ADJUSTMENT_NAME',
      label: 'Nombre',
      description: t('movements.filter.nameDesc'),
      movementType: 'ADJUSTMENT',
      adjustmentType: 'NAME',
    },
    {
      value: 'ADJUSTMENT_DESCRIPTION',
      label: 'Descripción',
      description: t('movements.filter.descriptionDesc'),
      movementType: 'ADJUSTMENT',
      adjustmentType: 'DESCRIPTION',
    },
  ];

  // Obtener el valor actual del select (combinando movementType y adjustmentType)
  const getCurrentValue = (): string => {
    if (localFilters.movementType === 'ADJUSTMENT' && localFilters.adjustmentType) {
      return `ADJUSTMENT_${localFilters.adjustmentType}`;
    }
    return localFilters.movementType || '';
  };

  const handleTypeChange = (value: string) => {
    if (!value) {
      setLocalFilters({
        ...localFilters,
        movementType: undefined,
        adjustmentType: undefined,
      });
      setSelectedTypeInfo(null);
      return;
    }

    const selected = movementTypes.find((t) => t.value === value);
    if (selected) {
      setLocalFilters({
        ...localFilters,
        movementType: selected.movementType,
        adjustmentType: selected.adjustmentType,
      });
      setSelectedTypeInfo(selected.description);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={hasActiveFilters ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        {t('filters.title')}
        {hasActiveFilters && (
          <span className="rounded-full bg-white/20 px-1.5 text-xs">
            {
              [
                filters.movementType,
                filters.dateFrom,
                filters.dateTo,
                filters.adjustmentType,
                filters.warehouse,
              ].filter(Boolean).length
            }
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-96 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-50">
                {t('filters.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de movimiento */}
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('movements.type')}
                  </label>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </div>
                <select
                  value={getCurrentValue()}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                >
                  <option value="">{t('filters.all')}</option>
                  {movementTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {/* Información del tipo seleccionado */}
                {selectedTypeInfo && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{selectedTypeInfo}</span>
                  </div>
                )}
              </div>

              {/* Fecha desde */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  {t('movements.dateFrom')}
                </label>
                <Input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  {t('movements.dateTo')}
                </label>
                <Input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateTo: e.target.value || undefined,
                    })
                  }
                />
              </div>

              {/* Almacén */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('movements.warehouse')}
                </label>
                <select
                  value={localFilters.warehouse || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      warehouse:
                        (e.target.value as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA') ||
                        undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                >
                  <option value="">{t('filters.all')}</option>
                  <option value="MEYPAR">{t('form.warehouse.meypar') || 'MEYPAR'}</option>
                  <option value="OLIVA_TORRAS">
                    {t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                  </option>
                  <option value="FURGONETA">
                    {t('form.warehouse.furgoneta') || 'Furgoneta'}
                  </option>
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1"
              >
                {t('filters.clear')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                className="flex-1"
              >
                {t('filters.apply')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
