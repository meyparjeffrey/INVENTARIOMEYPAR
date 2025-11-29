import { X, Check, Download } from "lucide-react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

export interface ColumnOption {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnOption[];
  onExport: (selectedColumns: string[]) => void;
  fileName?: string;
}

/**
 * Modal de selección de columnas para exportación Excel.
 */
export function ExportDialog({
  isOpen,
  onClose,
  columns,
  onExport,
  fileName = "productos"
}: ExportDialogProps) {
  const { t } = useLanguage();
  const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(
    new Set(columns.filter((c) => c.defaultSelected !== false).map((c) => c.key))
  );

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedColumns.size === columns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(columns.map((c) => c.key)));
    }
  };

  const handleExport = () => {
    if (selectedColumns.size === 0) {
      return; // No permitir exportar sin columnas
    }
    onExport(Array.from(selectedColumns));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {t("export.title") || "Exportar a Excel"}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("export.subtitle") || "Selecciona las columnas que deseas exportar"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={handleSelectAll}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  {selectedColumns.size === columns.length
                    ? t("export.deselectAll") || "Deseleccionar todas"
                    : t("export.selectAll") || "Seleccionar todas"}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedColumns.size} / {columns.length} {t("export.selected") || "seleccionadas"}
                </span>
              </div>

              <div className="space-y-2">
                {columns.map((column) => {
                  const isSelected = selectedColumns.has(column.key);
                  return (
                    <label
                      key={column.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition",
                        isSelected
                          ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                      )}
                    >
                      <div className="relative flex h-5 w-5 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleColumn(column.key)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        {isSelected && (
                          <Check className="absolute h-3.5 w-3.5 text-primary-600" />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-50">
                        {column.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {selectedColumns.size === 0 && (
                <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                  {t("export.errorNoColumns") || "Debes seleccionar al menos una columna"}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <Button variant="secondary" onClick={onClose}>
                {t("common.cancel") || "Cancelar"}
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedColumns.size === 0}
                className="min-w-[120px]"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("export.export") || "Exportar"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

