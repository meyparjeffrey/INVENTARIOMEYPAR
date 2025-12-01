import { Filter, X, Calendar } from "lucide-react";
import * as React from "react";
import type { MovementType } from "@domain/entities";
import type { MovementFilters as Filters } from "@domain/repositories/InventoryMovementRepository";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useLanguage } from "../../context/LanguageContext";

interface MovementFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

/**
 * Componente de filtros para movimientos.
 */
export function MovementFilters({
  filters,
  onFiltersChange
}: MovementFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters);

  // Sincronizar con filtros externos
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: Filters = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const hasActiveFilters =
    filters.movementType ||
    filters.dateFrom ||
    filters.dateTo;

  const movementTypes: { value: MovementType; label: string }[] = [
    { value: "IN", label: t("movements.type.IN") },
    { value: "OUT", label: t("movements.type.OUT") },
    { value: "ADJUSTMENT", label: t("movements.type.ADJUSTMENT") },
    { value: "TRANSFER", label: t("movements.type.TRANSFER") }
  ];

  return (
    <div className="relative">
      <Button
        variant={hasActiveFilters ? "primary" : "outline"}
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        {t("filters.title")}
        {hasActiveFilters && (
          <span className="rounded-full bg-white/20 px-1.5 text-xs">
            {[filters.movementType, filters.dateFrom, filters.dateTo].filter(Boolean).length}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-50">
                {t("filters.title")}
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("movements.type")}
                </label>
                <select
                  value={localFilters.movementType || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      movementType: (e.target.value as MovementType) || undefined
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                >
                  <option value="">{t("filters.all")}</option>
                  {movementTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  {t("movements.dateFrom")}
                </label>
                <Input
                  type="date"
                  value={localFilters.dateFrom || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateFrom: e.target.value || undefined
                    })
                  }
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  {t("movements.dateTo")}
                </label>
                <Input
                  type="date"
                  value={localFilters.dateTo || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateTo: e.target.value || undefined
                    })
                  }
                />
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
                {t("filters.clear")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                className="flex-1"
              >
                {t("filters.apply")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

