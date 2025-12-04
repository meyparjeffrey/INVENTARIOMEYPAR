import { CheckSquare, Square, Trash2, Download, Power, PowerOff, X } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  isAllSelected: boolean;
}

/**
 * Barra de acciones masivas para productos seleccionados.
 */
export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onActivate,
  onDeactivate,
  onExport,
  onDelete,
  isAllSelected
}: BulkActionsBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={cn(
          "sticky top-0 z-30 flex items-center justify-between gap-4 rounded-lg border-2 border-primary-500 bg-primary-50 px-4 py-3 shadow-lg",
          "dark:border-primary-600 dark:bg-primary-900/20"
        )}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-2"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isAllSelected
                ? t("products.bulk.deselectAll")
                : t("products.bulk.selectAll")}
            </span>
          </Button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {selectedCount} {t("products.bulk.selected")} {totalCount > 0 && `(${totalCount} ${t("products.total")})`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onActivate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onActivate}
              className="flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              {t("products.bulk.activate")}
            </Button>
          )}
          {onDeactivate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeactivate}
              className="flex items-center gap-2"
            >
              <PowerOff className="h-4 w-4" />
              {t("products.bulk.deactivate")}
            </Button>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {t("products.bulk.export")}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              {t("products.bulk.delete")}
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

