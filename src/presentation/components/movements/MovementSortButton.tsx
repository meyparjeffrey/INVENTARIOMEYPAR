import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";

interface MovementSortButtonProps {
  orderBy: "date" | "product";
  orderDirection: "asc" | "desc";
  onOrderChange: (orderBy: "date" | "product", orderDirection: "asc" | "desc") => void;
}

/**
 * Botón de ordenación con dropdown para movimientos.
 */
export function MovementSortButton({
  orderBy,
  orderDirection,
  onOrderChange
}: MovementSortButtonProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const options = [
    {
      label: t("movements.sort.dateAsc"),
      orderBy: "date" as const,
      orderDirection: "asc" as const,
      icon: ArrowUp
    },
    {
      label: t("movements.sort.dateDesc"),
      orderBy: "date" as const,
      orderDirection: "desc" as const,
      icon: ArrowDown
    },
    {
      label: t("movements.sort.productAsc"),
      orderBy: "product" as const,
      orderDirection: "asc" as const,
      icon: ArrowUp
    },
    {
      label: t("movements.sort.productDesc"),
      orderBy: "product" as const,
      orderDirection: "desc" as const,
      icon: ArrowDown
    }
  ];

  const currentOption = options.find(
    opt => opt.orderBy === orderBy && opt.orderDirection === orderDirection
  ) || options[1]; // Por defecto: fecha descendente

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <ArrowUpDown className="h-4 w-4" />
        {t("movements.sort.title")}
        {currentOption.icon === ArrowUp ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = option.orderBy === orderBy && option.orderDirection === orderDirection;
              
              return (
                <button
                  key={`${option.orderBy}-${option.orderDirection}`}
                  onClick={() => {
                    onOrderChange(option.orderBy, option.orderDirection);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected
                      ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

