import * as React from "react";
import { Filter, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { useLanguage } from "../../context/LanguageContext";

interface ColumnFilterProps {
  columnId: string;
  columnLabel: string;
  filterType: "text" | "number" | "select";
  options?: Array<{ value: string; label: string }>;
  value?: string | number;
  onChange: (value: string | number | undefined) => void;
  onClear: () => void;
}

/**
 * Filtro inline para columnas de tabla.
 */
export function ColumnFilter({
  columnId,
  columnLabel,
  filterType,
  options,
  value,
  onChange,
  onClear
}: ColumnFilterProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const hasFilter = value !== undefined && value !== "";

  return (
    <div ref={filterRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-6 w-6 p-0",
          hasFilter && "text-primary-600 dark:text-primary-400"
        )}
        title={t("products.filters.filter") || "Filtrar"}
      >
        <Filter className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {columnLabel}
              </span>
              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {filterType === "text" && (
              <Input
                type="text"
                value={value as string || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("products.filters.search") || "Buscar..."}
                className="h-8 text-xs"
                autoFocus
              />
            )}

            {filterType === "number" && (
              <Input
                type="number"
                value={value as number || ""}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                placeholder={t("products.filters.value") || "Valor"}
                className="h-8 text-xs"
                autoFocus
              />
            )}

            {filterType === "select" && options && (
              <select
                value={value as string || ""}
                onChange={(e) => onChange(e.target.value || undefined)}
                className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                autoFocus
              >
                <option value="">{t("products.filters.all") || "Todos"}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

