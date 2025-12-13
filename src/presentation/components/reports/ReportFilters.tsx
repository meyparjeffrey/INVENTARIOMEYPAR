/**
 * Componente reutilizable de filtros para informes.
 *
 * Proporciona filtros de fecha, producto, categoría, estado y usuario
 * con botones para aplicar, limpiar y resetear.
 *
 * @module @presentation/components/reports/ReportFilters
 */

import * as React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

export interface ReportFiltersProps {
  /** Filtros actuales */
  filters: Record<string, unknown>;
  /** Callback al cambiar filtros */
  onChange: (filters: Record<string, unknown>) => void;
  /** Callback al aplicar filtros */
  onApply: () => void;
  /** Callback al limpiar filtros */
  onClear: () => void;
  /** Si está abierto */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Tipos de filtros disponibles */
  availableFilters?: string[];
}

/**
 * Componente de filtros de informes.
 */
export function ReportFilters({
  filters,
  onChange,
  onApply,
  onClear,
  isOpen,
  onClose,
  availableFilters = ['dateFrom', 'dateTo', 'category', 'product', 'status'],
}: ReportFiltersProps) {
  if (!isOpen) return null;

  const handleFilterChange = (key: string, value: unknown) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Filtros
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {availableFilters.includes('dateFrom') && (
          <div>
            <Label htmlFor="dateFrom">Fecha desde</Label>
            <Input
              id="dateFrom"
              type="date"
              value={
                filters.dateFrom
                  ? new Date(filters.dateFrom as string).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) =>
                handleFilterChange('dateFrom', e.target.value || undefined)
              }
            />
          </div>
        )}

        {availableFilters.includes('dateTo') && (
          <div>
            <Label htmlFor="dateTo">Fecha hasta</Label>
            <Input
              id="dateTo"
              type="date"
              value={
                filters.dateTo
                  ? new Date(filters.dateTo as string).toISOString().split('T')[0]
                  : ''
              }
              onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
            />
          </div>
        )}

        {availableFilters.includes('category') && (
          <div>
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              type="text"
              placeholder="Filtrar por categoría"
              value={(filters.category as string) || ''}
              onChange={(e) =>
                handleFilterChange('category', e.target.value || undefined)
              }
            />
          </div>
        )}

        {availableFilters.includes('product') && (
          <div>
            <Label htmlFor="product">Producto</Label>
            <Input
              id="product"
              type="text"
              placeholder="Código o nombre de producto"
              value={(filters.product as string) || ''}
              onChange={(e) => handleFilterChange('product', e.target.value || undefined)}
            />
          </div>
        )}

        {availableFilters.includes('status') && (
          <div>
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              value={(filters.status as string) || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            >
              <option value="">Todos</option>
              <option value="OK">OK</option>
              <option value="DEFECTIVE">Defectuoso</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClear}>
          Limpiar
        </Button>
        <Button onClick={onApply}>Aplicar</Button>
      </div>
    </div>
  );
}
