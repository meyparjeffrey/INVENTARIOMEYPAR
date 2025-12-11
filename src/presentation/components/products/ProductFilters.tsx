/**
 * Componente de filtros avanzados para productos con diseño moderno.
 *
 * Incluye filtros por categoría, stock, precio, ubicación, estado de lote,
 * fechas (modificación y creación) con sliders, y funcionalidad para guardar
 * filtros favoritos.
 *
 * @module @presentation/components/products/ProductFilters
 */

import { Filter, X, Save, Bookmark } from 'lucide-react';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { useLanguage } from '../../context/LanguageContext';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { cn } from '../../lib/cn';
import {
  DateRangeSlider,
  getDateFromSliderValue,
  getSliderValueFromDate,
  isShortPeriod,
} from '../ui/DateRangeSlider';

export interface ProductFiltersState {
  category?: string;
  stockMin?: number;
  stockMax?: number;
  stockMinMin?: number; // Rango de stock mínimo
  stockMinMax?: number;
  priceMin?: number;
  priceMax?: number;
  supplierCode?: string;
  isBatchTracked?: boolean;
  lowStock?: boolean;
  stockNearMinimum?: boolean; // 15% sobre stock mínimo
  dateFrom?: string;
  dateTo?: string;
  lastModifiedType?: 'entries' | 'exits' | 'both'; // Tipo de modificación
  lastModifiedSlider?: number; // Valor del slider (0-6)
  createdAtFrom?: string;
  createdAtTo?: string;
  createdAtSlider?: number; // Valor del slider (0-6)
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Almacén
  aisle?: string; // Pasillo
  shelf?: string; // Estante
  batchStatus?: ('OK' | 'DEFECTIVE' | 'BLOCKED' | 'EXPIRED')[]; // Estado de lote
}

interface SavedFilter {
  id: string;
  name: string;
  filters: ProductFiltersState;
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onFiltersChange: (filters: ProductFiltersState) => void;
}

const STORAGE_KEY = 'product_filters_saved';

/**
 * Componente de filtros avanzados para productos.
 */
export function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [saveFilterName, setSaveFilterName] = React.useState('');

  // Estado local de filtros (solo se aplica cuando se hace clic en "Aplicar")
  const [localFilters, setLocalFilters] = React.useState<ProductFiltersState>(filters);

  // Sincronizar estado local cuando se abren los filtros o cambian los filtros externos
  React.useEffect(() => {
    if (isOpen) {
      // Al abrir, inicializar con los filtros actuales y sincronizar sliders
      const syncedFilters = { ...filters };

      // Sincronizar slider de modificación si hay fechas pero no slider
      if (
        (filters.dateFrom || filters.dateTo) &&
        filters.lastModifiedSlider === undefined
      ) {
        const sliderValue = getSliderValueFromDate(filters.dateFrom, filters.dateTo);
        if (sliderValue !== undefined) {
          syncedFilters.lastModifiedSlider = sliderValue;
        }
      }

      // Sincronizar slider de creación si hay fechas pero no slider
      if (
        (filters.createdAtFrom || filters.createdAtTo) &&
        filters.createdAtSlider === undefined
      ) {
        const sliderValue = getSliderValueFromDate(
          filters.createdAtFrom,
          filters.createdAtTo,
        );
        if (sliderValue !== undefined) {
          syncedFilters.createdAtSlider = sliderValue;
        }
      }

      setLocalFilters(syncedFilters);
    }
  }, [isOpen, filters]);

  // Cargar categorías disponibles
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('products')
          .select('category')
          .not('category', 'is', null)
          .order('category', { ascending: true });

        if (error) throw error;

        const uniqueCategories = Array.from(
          new Set((data || []).map((p) => p.category).filter(Boolean)),
        ) as string[];
        setCategories(uniqueCategories);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando categorías:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Cargar filtros guardados desde localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando filtros guardados:', error);
    }
  }, []);

  // Sincronizar slider de modificación con dateFrom (solo en estado local)
  React.useEffect(() => {
    if (localFilters.dateFrom && localFilters.lastModifiedSlider === undefined) {
      const sliderValue = getSliderValueFromDate(
        localFilters.dateFrom,
        localFilters.dateTo,
      );
      if (sliderValue !== undefined) {
        setLocalFilters((prev) => ({ ...prev, lastModifiedSlider: sliderValue }));
      }
    }
  }, [localFilters.dateFrom, localFilters.dateTo, localFilters.lastModifiedSlider]);

  // Sincronizar slider de creación con createdAtFrom (solo en estado local)
  React.useEffect(() => {
    if (localFilters.createdAtFrom && localFilters.createdAtSlider === undefined) {
      const sliderValue = getSliderValueFromDate(
        localFilters.createdAtFrom,
        localFilters.createdAtTo,
      );
      if (sliderValue !== undefined) {
        setLocalFilters((prev) => ({ ...prev, createdAtSlider: sliderValue }));
      }
    }
  }, [
    localFilters.createdAtFrom,
    localFilters.createdAtTo,
    localFilters.createdAtSlider,
  ]);

  /**
   * Cuenta los filtros activos de forma lógica.
   * Agrupa filtros relacionados (como fecha de modificación) como un solo filtro.
   */
  const countActiveFilters = (filterState: ProductFiltersState): number => {
    let count = 0;

    // Categoría
    if (filterState.category && filterState.category !== '') count++;

    // Stock actual (rango)
    if (filterState.stockMin !== undefined || filterState.stockMax !== undefined) count++;

    // Stock mínimo (rango)
    if (filterState.stockMinMin !== undefined || filterState.stockMinMax !== undefined)
      count++;

    // Precio (rango)
    if (filterState.priceMin !== undefined || filterState.priceMax !== undefined) count++;

    // Código proveedor
    if (filterState.supplierCode && filterState.supplierCode !== '') count++;

    // Almacén
    if (filterState.warehouse) count++;
    // Ubicación (pasillo o estante)
    if (filterState.aisle || filterState.shelf) count++;

    // Estado de lote
    if (filterState.batchStatus && filterState.batchStatus.length > 0) count++;

    // Filtros booleanos
    if (filterState.isBatchTracked === true) count++;
    if (filterState.lowStock === true) count++;
    if (filterState.stockNearMinimum === true) count++;

    // Fecha de modificación (agrupa dateFrom, dateTo y lastModifiedSlider como 1 filtro)
    if (
      filterState.dateFrom ||
      filterState.dateTo ||
      filterState.lastModifiedSlider !== undefined
    ) {
      count++;
    }

    // Fecha de creación (agrupa createdAtFrom, createdAtTo y createdAtSlider como 1 filtro)
    if (
      filterState.createdAtFrom ||
      filterState.createdAtTo ||
      filterState.createdAtSlider !== undefined
    ) {
      count++;
    }

    return count;
  };

  // Contar filtros activos aplicados (para el badge del botón)
  const activeFiltersCount = countActiveFilters(filters);

  // Contar filtros activos en estado local (para habilitar/deshabilitar botón Limpiar)
  const localActiveFiltersCount = countActiveFilters(localFilters);

  // Cambiar filtros en estado local (sin aplicar todavía)
  const handleFilterChange = (key: keyof ProductFiltersState, value: unknown) => {
    setLocalFilters({
      ...localFilters,
      [key]: value === '' ? undefined : value,
    });
  };

  // Aplicar filtros (solo cuando se hace clic en "Aplicar")
  const handleApply = () => {
    // Asegurar que los sliders estén sincronizados antes de aplicar
    const filtersToApply = { ...localFilters };

    // Sincronizar slider de modificación si hay fechas pero no slider
    if (
      (filtersToApply.dateFrom || filtersToApply.dateTo) &&
      filtersToApply.lastModifiedSlider === undefined
    ) {
      const sliderValue = getSliderValueFromDate(
        filtersToApply.dateFrom,
        filtersToApply.dateTo,
      );
      if (sliderValue !== undefined) {
        filtersToApply.lastModifiedSlider = sliderValue;
      }
    }

    // Sincronizar slider de creación si hay fechas pero no slider
    if (
      (filtersToApply.createdAtFrom || filtersToApply.createdAtTo) &&
      filtersToApply.createdAtSlider === undefined
    ) {
      const sliderValue = getSliderValueFromDate(
        filtersToApply.createdAtFrom,
        filtersToApply.createdAtTo,
      );
      if (sliderValue !== undefined) {
        filtersToApply.createdAtSlider = sliderValue;
      }
    }

    onFiltersChange(filtersToApply);
    setIsOpen(false);
  };

  // Cerrar sin aplicar (restaurar estado local a los filtros actuales)
  const handleClose = () => {
    setLocalFilters(filters); // Restaurar a los filtros actuales
    setIsOpen(false);
  };

  const handleSliderChange = (
    type: 'modified' | 'created',
    value: number | undefined,
  ) => {
    if (value === undefined) {
      if (type === 'modified') {
        setLocalFilters({
          ...localFilters,
          lastModifiedSlider: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        });
      } else {
        setLocalFilters({
          ...localFilters,
          createdAtSlider: undefined,
          createdAtFrom: undefined,
          createdAtTo: undefined,
        });
      }
      return;
    }

    const dateFrom = getDateFromSliderValue(value);
    const isShort = isShortPeriod(value);

    // Lógica según período:
    // - Períodos cortos (1 semana, 15 días): mostrar productos RECIENTES (dateFrom = fecha límite, dateTo = hoy)
    // - Períodos largos (1 mes+): mostrar productos ANTIGUOS (dateFrom = undefined, dateTo = fecha límite)
    if (type === 'modified') {
      if (isShort) {
        // Período corto: productos modificados RECIENTEMENTE (desde dateFrom hasta hoy)
        setLocalFilters({
          ...localFilters,
          lastModifiedSlider: value,
          dateFrom,
          dateTo: new Date().toISOString().split('T')[0],
        });
      } else {
        // Período largo: productos NO modificados (hasta dateFrom)
        setLocalFilters({
          ...localFilters,
          lastModifiedSlider: value,
          dateFrom: undefined,
          dateTo: dateFrom,
        });
      }
    } else {
      // Misma lógica para creación
      if (isShort) {
        // Período corto: productos creados RECIENTEMENTE (desde dateFrom hasta hoy)
        setLocalFilters({
          ...localFilters,
          createdAtSlider: value,
          createdAtFrom: dateFrom,
          createdAtTo: new Date().toISOString().split('T')[0],
        });
      } else {
        // Período largo: productos creados hace mucho (hasta dateFrom)
        setLocalFilters({
          ...localFilters,
          createdAtSlider: value,
          createdAtFrom: undefined,
          createdAtTo: dateFrom,
        });
      }
    }
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName.trim(),
      filters: { ...localFilters },
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowSaveDialog(false);
    setSaveFilterName('');
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setLocalFilters(savedFilter.filters);
  };

  const handleDeleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="relative">
        <Filter className="mr-2 h-4 w-4" />
        {t('filters.title') || 'Filtros'}
        {activeFiltersCount > 0 && (
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={handleClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              className="fixed left-1/2 top-1/2 z-50 flex flex-col w-[90vw] sm:w-[500px] max-w-[500px] max-h-[90vh] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
              onWheel={(e) => {
                // Prevenir que el scroll se propague a la página detrás
                e.stopPropagation();
              }}
              onClick={(e) => {
                // Prevenir que los clicks se propaguen al overlay
                e.stopPropagation();
              }}
            >
              {/* Header fijo */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t('filters.title') || 'Filtros Avanzados'}
                </h3>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contenido con scroll */}
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="space-y-4">
                  {/* Filtros guardados */}
                  {savedFilters.length > 0 && (
                    <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
                      <Label className="mb-2 block">{t('filters.saved.title')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {savedFilters.map((saved) => (
                          <div
                            key={saved.id}
                            className="group relative flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                          >
                            <button
                              onClick={() => handleLoadFilter(saved)}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Bookmark className="h-3 w-3" />
                              {saved.name}
                            </button>
                            <button
                              onClick={() => handleDeleteFilter(saved.id)}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary-500 hover:text-primary-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categoría */}
                  <div>
                    <Label htmlFor="filter-category">{t('table.category')}</Label>
                    <select
                      id="filter-category"
                      value={localFilters.category || ''}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="">{t('filters.all') || 'Todas'}</option>
                      {loadingCategories ? (
                        <option disabled>{t('common.loading')}</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Almacén */}
                  <div>
                    <Label>{t('filters.warehouse') || 'Almacén'}</Label>
                    <div className="mt-1 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="warehouse-filter"
                          checked={!localFilters.warehouse}
                          onChange={() => handleFilterChange('warehouse', undefined)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('filters.warehouse.all') || 'Todos'}
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="warehouse-filter"
                          checked={localFilters.warehouse === 'MEYPAR'}
                          onChange={() => handleFilterChange('warehouse', 'MEYPAR')}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('form.warehouse.meypar') || 'MEYPAR'}
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="warehouse-filter"
                          checked={localFilters.warehouse === 'OLIVA_TORRAS'}
                          onChange={() => handleFilterChange('warehouse', 'OLIVA_TORRAS')}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="warehouse-filter"
                          checked={localFilters.warehouse === 'FURGONETA'}
                          onChange={() => handleFilterChange('warehouse', 'FURGONETA')}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('form.warehouse.furgoneta') || 'Furgoneta'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="filter-aisle">{t('filters.aisle')}</Label>
                      <Input
                        id="filter-aisle"
                        value={localFilters.aisle || ''}
                        onChange={(e) => handleFilterChange('aisle', e.target.value)}
                        placeholder={t('filters.aislePlaceholder')}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="filter-shelf">{t('filters.shelf')}</Label>
                      <Input
                        id="filter-shelf"
                        value={localFilters.shelf || ''}
                        onChange={(e) => handleFilterChange('shelf', e.target.value)}
                        placeholder={t('filters.shelfPlaceholder')}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Stock actual */}
                  <div>
                    <Label>{t('table.stock')} (actual)</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          placeholder={t('filters.min') || 'Mín'}
                          value={localFilters.stockMin || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'stockMin',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder={t('filters.max') || 'Máx'}
                          value={localFilters.stockMax || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'stockMax',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stock mínimo (rango) */}
                  <div>
                    <Label>{t('filters.stockMinRange')}</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          placeholder={t('filters.min') || 'Mín'}
                          value={localFilters.stockMinMin || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'stockMinMin',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder={t('filters.max') || 'Máx'}
                          value={localFilters.stockMinMax || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'stockMinMax',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Precio */}
                  <div>
                    <Label>{t('filters.price')}</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('filters.min') || 'Mín'}
                          value={localFilters.priceMin || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'priceMin',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('filters.max') || 'Máx'}
                          value={localFilters.priceMax || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'priceMax',
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Código Proveedor */}
                  <div>
                    <Label htmlFor="filter-supplier">{t('table.supplierCode')}</Label>
                    <Input
                      id="filter-supplier"
                      value={localFilters.supplierCode || ''}
                      onChange={(e) => handleFilterChange('supplierCode', e.target.value)}
                      placeholder={
                        t('filters.supplierCodePlaceholder') || 'Buscar por código...'
                      }
                    />
                  </div>

                  {/* Estado de lote */}
                  <div>
                    <Label>{t('filters.batchStatus')}</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(['OK', 'DEFECTIVE', 'BLOCKED', 'EXPIRED'] as const).map(
                        (status) => (
                          <label key={status} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                localFilters.batchStatus?.includes(status) || false
                              }
                              onChange={(e) => {
                                const current = localFilters.batchStatus || [];
                                const updated = e.target.checked
                                  ? [...current, status]
                                  : current.filter((s) => s !== status);
                                handleFilterChange(
                                  'batchStatus',
                                  updated.length > 0 ? updated : undefined,
                                );
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {status}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localFilters.isBatchTracked || false}
                        onChange={(e) =>
                          handleFilterChange(
                            'isBatchTracked',
                            e.target.checked || undefined,
                          )
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('filters.batchTracked') || 'Solo con lotes'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localFilters.lowStock || false}
                        onChange={(e) =>
                          handleFilterChange('lowStock', e.target.checked || undefined)
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('products.lowStockOnly')}
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localFilters.stockNearMinimum || false}
                        onChange={(e) =>
                          handleFilterChange(
                            'stockNearMinimum',
                            e.target.checked || undefined,
                          )
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('filters.stockNearMinimum') ||
                          'Productes al 15% del stock mínim'}
                      </span>
                    </label>
                  </div>

                  {/* Filtros por fecha de modificación con slider */}
                  <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Label>{t('filters.lastModified') || 'Última modificación'}</Label>
                      {localFilters.lastModifiedSlider !== undefined && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            isShortPeriod(localFilters.lastModifiedSlider)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                          )}
                        >
                          {isShortPeriod(localFilters.lastModifiedSlider)
                            ? t('filters.recent')
                            : t('filters.old')}
                        </span>
                      )}
                    </div>

                    <DateRangeSlider
                      value={localFilters.lastModifiedSlider}
                      onChange={(value) => handleSliderChange('modified', value)}
                      label=""
                    />

                    {/* Tipo de modificación */}
                    <div>
                      <Label className="text-xs mb-1 block">
                        {t('filters.modificationType') || 'Tipus de modificació'}
                      </Label>
                      <select
                        value={localFilters.lastModifiedType || 'both'}
                        onChange={(e) =>
                          handleFilterChange(
                            'lastModifiedType',
                            (e.target.value as 'entries' | 'exits' | 'both') || undefined,
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="both">{t('filters.both') || 'Ambdues'}</option>
                        <option value="entries">
                          {t('filters.entriesOnly') || 'Només entrades'}
                        </option>
                        <option value="exits">
                          {t('filters.exitsOnly') || 'Només sortides'}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Filtros por fecha de creación con slider */}
                  <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Label>{t('products.createdAt')}</Label>
                      {localFilters.createdAtSlider !== undefined && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            isShortPeriod(localFilters.createdAtSlider)
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                          )}
                        >
                          {isShortPeriod(localFilters.createdAtSlider)
                            ? t('filters.recent')
                            : t('filters.old')}
                        </span>
                      )}
                    </div>

                    <DateRangeSlider
                      value={localFilters.createdAtSlider}
                      onChange={(value) => handleSliderChange('created', value)}
                      label=""
                    />
                  </div>
                </div>
              </div>

              {/* Botones fijos en la parte inferior */}
              <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {t('common.save')}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setLocalFilters({});
                    }}
                    disabled={localActiveFiltersCount === 0}
                  >
                    {t('filters.clear') || 'Netejar'}
                  </Button>
                  <Button size="sm" onClick={handleApply}>
                    {t('filters.apply') || 'Aplicar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Diálogo para guardar filtro */}
      <AnimatePresence>
        {showSaveDialog && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/20"
              onClick={() => setShowSaveDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            >
              <h4 className="mb-4 text-lg font-semibold">{t('filters.saved.save')}</h4>
              <Input
                placeholder={t('filters.saved.namePlaceholder')}
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
                className="mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveFilterName('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFilter}
                  disabled={!saveFilterName.trim()}
                >
                  {t('common.save')}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
