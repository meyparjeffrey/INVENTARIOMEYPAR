import { Filter, X } from "lucide-react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

export interface ProductFiltersState {
  category?: string;
  stockMin?: number;
  stockMax?: number;
  priceMin?: number;
  priceMax?: number;
  supplierCode?: string;
  isBatchTracked?: boolean;
  lowStock?: boolean;
  stockNearMinimum?: boolean; // 15% sobre stock mínimo
  dateFrom?: string;
  dateTo?: string;
  lastModifiedType?: "entries" | "exits" | "both"; // Tipo de modificación
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onFiltersChange: (filters: ProductFiltersState) => void;
  onClear: () => void;
}

/**
 * Componente de filtros avanzados para productos con diseño moderno.
 */
// Función auxiliar para obtener fecha hace N días
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export function ProductFilters({ filters, onFiltersChange, onClear }: ProductFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  // Cargar categorías disponibles
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("products")
          .select("category")
          .not("category", "is", null)
          .order("category", { ascending: true });

        if (error) throw error;

        const uniqueCategories = Array.from(
          new Set((data || []).map((p) => p.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error cargando categorías:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && v !== false
  ).length;

  const handleFilterChange = (key: keyof ProductFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === "" ? undefined : value
    });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Filter className="mr-2 h-4 w-4" />
        {t("filters.title") || "Filtros"}
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
              className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t("filters.title") || "Filtros Avanzados"}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Categoría */}
                <div>
                  <Label htmlFor="filter-category">
                    {t("table.category")}
                  </Label>
                  <select
                    id="filter-category"
                    value={filters.category || ""}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">{t("filters.all") || "Todas"}</option>
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

                {/* Stock */}
                <div>
                  <Label>{t("table.stock")}</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder={t("filters.min") || "Mín"}
                        value={filters.stockMin || ""}
                        onChange={(e) =>
                          handleFilterChange("stockMin", e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder={t("filters.max") || "Máx"}
                        value={filters.stockMax || ""}
                        onChange={(e) =>
                          handleFilterChange("stockMax", e.target.value ? Number(e.target.value) : undefined)
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
                        placeholder={t("filters.min") || "Mín"}
                        value={filters.priceMin || ""}
                        onChange={(e) =>
                          handleFilterChange("priceMin", e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("filters.max") || "Máx"}
                        value={filters.priceMax || ""}
                        onChange={(e) =>
                          handleFilterChange("priceMax", e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Código Proveedor */}
                <div>
                  <Label htmlFor="filter-supplier">
                    {t("table.supplierCode")}
                  </Label>
                  <Input
                    id="filter-supplier"
                    value={filters.supplierCode || ""}
                    onChange={(e) => handleFilterChange("supplierCode", e.target.value)}
                    placeholder={t("filters.supplierCodePlaceholder") || "Buscar por código..."}
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.isBatchTracked || false}
                      onChange={(e) => handleFilterChange("isBatchTracked", e.target.checked || undefined)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t("filters.batchTracked") || "Solo con lotes"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.lowStock || false}
                      onChange={(e) => handleFilterChange("lowStock", e.target.checked || undefined)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t("products.lowStockOnly")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.stockNearMinimum || false}
                      onChange={(e) => handleFilterChange("stockNearMinimum", e.target.checked || undefined)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t("filters.stockNearMinimum") || "Productos al 15% del stock mínimo"}
                    </span>
                  </label>
                </div>

                {/* Filtros por fecha de modificación */}
                <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <Label>{t("filters.lastModified") || "Última modificación"}</Label>
                  
                  {/* Botones rápidos */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={filters.dateFrom === getDateDaysAgo(7) ? "primary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const dateFrom = getDateDaysAgo(7);
                        handleFilterChange("dateFrom", dateFrom);
                        handleFilterChange("dateTo", undefined);
                      }}
                    >
                      {t("filters.last7Days") || "7 días"}
                    </Button>
                    <Button
                      type="button"
                      variant={filters.dateFrom === getDateDaysAgo(30) ? "primary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const dateFrom = getDateDaysAgo(30);
                        handleFilterChange("dateFrom", dateFrom);
                        handleFilterChange("dateTo", undefined);
                      }}
                    >
                      {t("filters.last30Days") || "30 días"}
                    </Button>
                    <Button
                      type="button"
                      variant={filters.dateFrom === getDateDaysAgo(90) ? "primary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const dateFrom = getDateDaysAgo(90);
                        handleFilterChange("dateFrom", dateFrom);
                        handleFilterChange("dateTo", undefined);
                      }}
                    >
                      {t("filters.last90Days") || "90 días"}
                    </Button>
                    <Button
                      type="button"
                      variant={filters.dateFrom === getDateDaysAgo(365) ? "primary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const dateFrom = getDateDaysAgo(365);
                        handleFilterChange("dateFrom", dateFrom);
                        handleFilterChange("dateTo", undefined);
                      }}
                    >
                      {t("filters.lastYear") || "1 año"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFilterChange("dateFrom", undefined);
                        handleFilterChange("dateTo", undefined);
                      }}
                    >
                      {t("filters.clear") || "Limpiar"}
                    </Button>
                  </div>

                  {/* Selector de rango personalizado */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="filter-dateFrom" className="text-xs">
                        {t("filters.dateFrom") || "Desde"}
                      </Label>
                      <Input
                        id="filter-dateFrom"
                        type="date"
                        value={filters.dateFrom || ""}
                        onChange={(e) => handleFilterChange("dateFrom", e.target.value || undefined)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="filter-dateTo" className="text-xs">
                        {t("filters.dateTo") || "Hasta"}
                      </Label>
                      <Input
                        id="filter-dateTo"
                        type="date"
                        value={filters.dateTo || ""}
                        onChange={(e) => handleFilterChange("dateTo", e.target.value || undefined)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Tipo de modificación */}
                  <div>
                    <Label className="text-xs mb-1 block">
                      {t("filters.modificationType") || "Tipo de modificación"}
                    </Label>
                    <select
                      value={filters.lastModifiedType || "both"}
                      onChange={(e) => handleFilterChange("lastModifiedType", e.target.value as "entries" | "exits" | "both" || undefined)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="both">{t("filters.both") || "Ambas"}</option>
                      <option value="entries">{t("filters.entriesOnly") || "Solo entradas"}</option>
                      <option value="exits">{t("filters.exitsOnly") || "Solo salidas"}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClear}
                  disabled={activeFiltersCount === 0}
                >
                  {t("filters.clear") || "Limpiar"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  {t("filters.apply") || "Aplicar"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

