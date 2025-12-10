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
  onClear: () => void;
}

const STORAGE_KEY = 'product_filters_saved';

/**
 * Componente de filtros avanzados para productos.
 */
export function ProductFilters({
  filters,
  onFiltersChange,
  onClear,
}: ProductFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [saveFilterName, setSaveFilterName] = React.useState('');

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

  // Sincronizar slider de modificación con dateFrom
  React.useEffect(() => {
    if (filters.dateFrom && !filters.lastModifiedSlider) {
      const sliderValue = getSliderValueFromDate(filters.dateFrom);
      if (sliderValue !== undefined) {
        onFiltersChange({ ...filters, lastModifiedSlider: sliderValue });
      }
    }
  }, [filters.dateFrom]);

  // Sincronizar slider de creación con createdAtFrom
  React.useEffect(() => {
    if (filters.createdAtFrom && !filters.createdAtSlider) {
      const sliderValue = getSliderValueFromDate(filters.createdAtFrom);
      if (sliderValue !== undefined) {
        onFiltersChange({ ...filters, createdAtSlider: sliderValue });
      }
    }
  }, [filters.createdAtFrom]);

  const activeFiltersCount = Object.values(filters).filter(
    (v) =>
      v !== undefined && v !== '' && v !== false && (!Array.isArray(v) || v.length > 0),
  ).length;

  const handleFilterChange = (key: keyof ProductFiltersState, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const handleSliderChange = (
    type: 'modified' | 'created',
    value: number | undefined,
  ) => {
    if (value === undefined) {
      if (type === 'modified') {
        handleFilterChange('lastModifiedSlider', undefined);
        handleFilterChange('dateFrom', undefined);
        handleFilterChange('dateTo', undefined);
      } else {
        handleFilterChange('createdAtSlider', undefined);
        handleFilterChange('createdAtFrom', undefined);
        handleFilterChange('createdAtTo', undefined);
      }
      return;
    }

    const dateFrom = getDateFromSliderValue(value);
    const isShort = isShortPeriod(value);

    // Lógica según período:
    // - Períodos cortos (1 semana, 15 días): mostrar productos RECIENTES (dateFrom = fecha límite, dateTo = hoy)
    // - Períodos largos (1 mes+): mostrar productos ANTIGUOS (dateFrom = undefined, dateTo = fecha límite)
    if (type === 'modified') {
      handleFilterChange('lastModifiedSlider', value);
      if (isShort) {
        // Período corto: productos modificados RECIENTEMENTE (desde dateFrom hasta hoy)
        handleFilterChange('dateFrom', dateFrom);
        handleFilterChange('dateTo', new Date().toISOString().split('T')[0]);
      } else {
        // Período largo: productos NO modificados (hasta dateFrom)
        handleFilterChange('dateFrom', undefined);
        handleFilterChange('dateTo', dateFrom);
      }
    } else {
      // Misma lógica para creación
      handleFilterChange('createdAtSlider', value);
      if (isShort) {
        // Período corto: productos creados RECIENTEMENTE (desde dateFrom hasta hoy)
        handleFilterChange('createdAtFrom', dateFrom);
        handleFilterChange('createdAtTo', new Date().toISOString().split('T')[0]);
      } else {
        // Período largo: productos creados hace mucho (hasta dateFrom)
        handleFilterChange('createdAtFrom', undefined);
        handleFilterChange('createdAtTo', dateFrom);
      }
    }
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName.trim(),
      filters: { ...filters },
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowSaveDialog(false);
    setSaveFilterName('');
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
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
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed right-4 top-1/2 z-50 -translate-y-1/2 w-[500px] max-h-[90vh] rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800 overflow-y-auto"
              onWheel={(e) => {
                // Prevenir que el scroll se propague a la página detrás
                e.stopPropagation();
              }}
              onClick={(e) => {
                // Prevenir que los clicks se propaguen al overlay
                e.stopPropagation();
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t('filters.title') || 'Filtros Avanzados'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Filtros guardados */}
                {savedFilters.length > 0 && (
                  <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
                    <Label className="mb-2 block">Filtros guardados</Label>
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
                    value={filters.category || ''}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">{t('filters.all') || 'Todas'}</option>
                    {loadingCategories ? (
                      <option disabled>Cargando...</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Ubicación */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="filter-aisle">Pasillo</Label>
                    <Input
                      id="filter-aisle"
                      value={filters.aisle || ''}
                      onChange={(e) => handleFilterChange('aisle', e.target.value)}
                      placeholder="Ej: A1, B2..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-shelf">Estante</Label>
                    <Input
                      id="filter-shelf"
                      value={filters.shelf || ''}
                      onChange={(e) => handleFilterChange('shelf', e.target.value)}
                      placeholder="Ej: E1, E2..."
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
                        value={filters.stockMin || ''}
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
                        value={filters.stockMax || ''}
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
                  <Label>Stock mínimo (rango)</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder={t('filters.min') || 'Mín'}
                        value={filters.stockMinMin || ''}
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
                        value={filters.stockMinMax || ''}
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
                  <Label>Precio (€)</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t('filters.min') || 'Mín'}
                        value={filters.priceMin || ''}
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
                        value={filters.priceMax || ''}
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
                    value={filters.supplierCode || ''}
                    onChange={(e) => handleFilterChange('supplierCode', e.target.value)}
                    placeholder={
                      t('filters.supplierCodePlaceholder') || 'Buscar por código...'
                    }
                  />
                </div>

                {/* Estado de lote */}
                <div>
                  <Label>Estado de lote</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(['OK', 'DEFECTIVE', 'BLOCKED', 'EXPIRED'] as const).map(
                      (status) => (
                        <label key={status} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filters.batchStatus?.includes(status) || false}
                            onChange={(e) => {
                              const current = filters.batchStatus || [];
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
                      checked={filters.isBatchTracked || false}
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
                      checked={filters.lowStock || false}
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
                      checked={filters.stockNearMinimum || false}
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
                    {filters.lastModifiedSlider !== undefined && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          isShortPeriod(filters.lastModifiedSlider)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                        )}
                      >
                        {isShortPeriod(filters.lastModifiedSlider)
                          ? 'Recientes'
                          : 'Antiguos'}
                      </span>
                    )}
                  </div>

                  <DateRangeSlider
                    value={filters.lastModifiedSlider}
                    onChange={(value) => handleSliderChange('modified', value)}
                    label=""
                  />

                  {/* Tipo de modificación */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      {t('filters.modificationType') || 'Tipus de modificació'}
                    </Label>
                    <select
                      value={filters.lastModifiedType || 'both'}
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
                    <Label>Fecha de creación</Label>
                    {filters.createdAtSlider !== undefined && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          isShortPeriod(filters.createdAtSlider)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                        )}
                      >
                        {isShortPeriod(filters.createdAtSlider)
                          ? 'Recientes'
                          : 'Antiguos'}
                      </span>
                    )}
                  </div>

                  <DateRangeSlider
                    value={filters.createdAtSlider}
                    onChange={(value) => handleSliderChange('created', value)}
                    label=""
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="mt-6 flex items-center justify-between gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClear}
                    disabled={activeFiltersCount === 0}
                  >
                    {t('filters.clear') || 'Netejar'}
                  </Button>
                  <Button size="sm" onClick={() => setIsOpen(false)}>
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
              <h4 className="mb-4 text-lg font-semibold">Guardar filtros</h4>
              <Input
                placeholder="Nombre del filtro..."
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
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFilter}
                  disabled={!saveFilterName.trim()}
                >
                  Guardar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
