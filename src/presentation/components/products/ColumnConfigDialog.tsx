import { Settings, X, GripVertical, Eye, EyeOff, RotateCcw, Save } from "lucide-react";
import * as React from "react";
import { motion, Reorder } from "framer-motion";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import type { TableColumn } from "../../hooks/useTableColumns";

interface ColumnConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TableColumn[];
  onSave: (columns: TableColumn[]) => void;
  onReset: () => void;
}

/**
 * Diálogo para configurar columnas de la tabla: mostrar/ocultar, reordenar.
 */
export function ColumnConfigDialog({
  isOpen,
  onClose,
  columns,
  onSave,
  onReset
}: ColumnConfigDialogProps) {
  const { t } = useLanguage();
  const [items, setItems] = React.useState<TableColumn[]>(columns);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setItems(columns);
      setHasChanges(false);
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const handleReorder = (newOrder: TableColumn[]) => {
    // Actualizar el orden en los items
    const reordered = newOrder.map((col, index) => ({
      ...col,
      order: index
    }));
    setItems(reordered);
    setHasChanges(true);
  };

  const handleToggleVisibility = (columnId: string) => {
    const updated = items.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setItems(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Aplicar los cambios guardando las columnas
    onSave(items);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm(t("common.unsavedChanges") || "¿Descartar los cambios sin guardar?")) {
        setItems(columns);
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t("products.columns.configure")}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t("products.columns.dragToReorder")}
          </p>

          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {items.map((column) => (
              <Reorder.Item
                key={column.id}
                value={column}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3",
                  "dark:border-gray-700 dark:bg-gray-800",
                  "cursor-grab active:cursor-grabbing"
                )}
              >
                <GripVertical className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    {column.label}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleVisibility(column.id)}
                  className="h-8 w-8 p-0"
                  title={column.visible ? t("products.columns.hidden") : t("products.columns.visible")}
                >
                  {column.visible ? (
                    <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("products.columns.reset")}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleSave}
              className={cn(
                "flex items-center gap-2",
                hasChanges && "bg-primary-600 hover:bg-primary-700"
              )}
            >
              <Save className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

