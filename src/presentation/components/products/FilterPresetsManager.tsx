import * as React from "react";
import { Save, Trash2, Filter, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useLanguage } from "../../context/LanguageContext";
import { useFilterPresets, type FilterPreset } from "../../hooks/useFilterPresets";
import type { ProductFiltersState } from "./ProductFilters";
import { cn } from "../../lib/cn";

interface FilterPresetsManagerProps {
  currentFilters: ProductFiltersState;
  onLoadPreset: (filters: ProductFiltersState) => void;
}

/**
 * Componente para gestionar presets de filtros guardados.
 */
export function FilterPresetsManager({ currentFilters, onLoadPreset }: FilterPresetsManagerProps) {
  const { t } = useLanguage();
  const { presets, isLoading, savePreset, deletePreset } = useFilterPresets();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [presetName, setPresetName] = React.useState("");

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    await savePreset(presetName.trim(), currentFilters);
    setPresetName("");
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
    setIsOpen(false);
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("products.filters.deletePreset") || "¿Eliminar este preset?")) {
      await deletePreset(presetId);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        title={t("products.filters.loadPreset") || "Cargar preset"}
      >
        <Filter className="h-4 w-4" />
        {presets.length > 0 && (
          <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {presets.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {t("products.filters.loadPreset") || "Presets guardados"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("common.loading") || "Cargando..."}
                </div>
              ) : presets.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("products.filters.noPresets") || "No hay presets guardados"}
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="group flex items-center justify-between rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300"
                      >
                        {preset.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {t("products.filters.savePreset") || "Guardar preset"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSaveDialog && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSaveDialog(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
                {t("products.filters.savePreset") || "Guardar preset"}
              </h3>
              <Input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t("products.filters.presetName") || "Nombre del preset"}
                className="mb-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSavePreset();
                  } else if (e.key === "Escape") {
                    setShowSaveDialog(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="flex-1"
                >
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

