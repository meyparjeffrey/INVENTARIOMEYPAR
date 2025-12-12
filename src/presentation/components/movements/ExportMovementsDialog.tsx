import { Download, FileSpreadsheet, Filter } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

export type ExportMovementType = "ALL" | "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "CHANGES";

interface ExportMovementsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (exportType: ExportMovementType) => void;
}

/**
 * Modal de exportación de movimientos con opciones de filtrado.
 * 
 * Permite exportar todos los movimientos o filtrar por tipo:
 * - Todo
 * - Solo Entradas (IN)
 * - Solo Salidas (OUT)
 * - Solo Ajustes (ADJUSTMENT)
 * - Solo Transferencias (TRANSFER)
 * - Solo Cambios (cambios de nombre/ubicación en productos)
 * 
 * @component
 * @param {ExportMovementsDialogProps} props - Propiedades del componente
 */
export function ExportMovementsDialog({
  isOpen,
  onClose,
  onExport
}: ExportMovementsDialogProps) {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = React.useState<ExportMovementType>("ALL");
  const [exporting, setExporting] = React.useState(false);

  const exportOptions: {
    value: ExportMovementType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "ALL",
      label: t("movements.export.all") || "Todos los movimientos",
      description: t("movements.export.allDesc") || "Exporta todos los movimientos sin filtrar",
      icon: <Filter className="h-5 w-5" />
    },
    {
      value: "IN",
      label: t("movements.export.entriesOnly") || "Solo Entradas",
      description: t("movements.export.entriesDesc") || "Exporta únicamente movimientos de entrada de stock",
      icon: <Download className="h-5 w-5 text-green-600" />
    },
    {
      value: "OUT",
      label: t("movements.export.exitsOnly") || "Solo Salidas",
      description: t("movements.export.exitsDesc") || "Exporta únicamente movimientos de salida de stock",
      icon: <Download className="h-5 w-5 text-red-600 rotate-180" />
    },
    {
      value: "ADJUSTMENT",
      label: t("movements.export.adjustmentsOnly") || "Solo Ajustes",
      description: t("movements.export.adjustmentsDesc") || "Exporta únicamente ajustes de inventario",
      icon: <Filter className="h-5 w-5 text-blue-600" />
    },
    {
      value: "TRANSFER",
      label: t("movements.export.transfersOnly") || "Solo Transferencias",
      description: t("movements.export.transfersDesc") || "Exporta únicamente transferencias entre ubicaciones",
      icon: <Filter className="h-5 w-5 text-purple-600" />
    },
    {
      value: "CHANGES",
      label: t("movements.export.changesOnly") || "Solo Cambios",
      description: t("movements.export.changesDesc") || "Exporta movimientos que incluyen cambios en nombre, código o ubicación",
      icon: <Filter className="h-5 w-5 text-amber-600" />
    }
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(selectedType);
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al exportar:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("movements.export.title") || "Exportar Movimientos"}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("movements.export.description") || "Selecciona qué tipo de movimientos deseas exportar:"}
        </p>

        <div className="space-y-2">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedType(option.value)}
              className={cn(
                "w-full rounded-lg border-2 p-3 text-left transition-all",
                selectedType === option.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{option.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-50">
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
                {selectedType === option.value && (
                  <div className="mt-0.5">
                    <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={exporting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            className="flex-1 gap-2"
            disabled={exporting}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? t("common.exporting") || "Exportando..." : t("common.export")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

