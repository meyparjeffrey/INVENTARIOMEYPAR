import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Info } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { useLanguage } from "../../context/LanguageContext";

interface MovementsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de ayuda e información sobre movimientos de inventario.
 * 
 * Explica cada tipo de movimiento y cómo utilizarlos correctamente.
 * 
 * @component
 * @param {MovementsHelpModalProps} props - Propiedades del componente
 */
export function MovementsHelpModal({ isOpen, onClose }: MovementsHelpModalProps) {
  const { t } = useLanguage();

  const helpSections = [
    {
      icon: <ArrowDownCircle className="h-6 w-6 text-green-600" />,
      title: t("movements.help.entry.title") || "Entrada de Stock",
      description: t("movements.help.entry.description") || "Aumenta el stock del producto en el inventario.",
      whenToUse: t("movements.help.entry.whenToUse") || "Usa cuando recibas productos nuevos, compras, devoluciones de clientes o producción.",
      examples: [
        t("movements.help.entry.example1") || "Recibiste 50 unidades de un producto",
        t("movements.help.entry.example2") || "Un cliente devolvió 5 productos",
        t("movements.help.entry.example3") || "Producción terminada: 100 unidades nuevas"
      ]
    },
    {
      icon: <ArrowUpCircle className="h-6 w-6 text-red-600" />,
      title: t("movements.help.exit.title") || "Salida de Stock",
      description: t("movements.help.exit.description") || "Disminuye el stock del producto en el inventario.",
      whenToUse: t("movements.help.exit.whenToUse") || "Usa cuando vendas productos, envíes a clientes, consumas en producción o descartes productos.",
      examples: [
        t("movements.help.exit.example1") || "Venta de 10 unidades a un cliente",
        t("movements.help.exit.example2") || "Uso en producción: 20 unidades consumidas",
        t("movements.help.exit.example3") || "Productos defectuosos descartados: 3 unidades"
      ]
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-blue-600" />,
      title: t("movements.help.adjustment.title") || "Ajuste de Inventario",
      description: t("movements.help.adjustment.description") || "Corrige discrepancias de inventario sin afectar el stock directamente.",
      whenToUse: t("movements.help.adjustment.whenToUse") || "Usa para corregir errores de conteo, registrar daños, pérdidas no contabilizadas, ajustes por auditorías o cambios en propiedades del producto (código, nombre, ubicación).",
      examples: [
        t("movements.help.adjustment.example1") || "Error de conteo detectado en auditoría",
        t("movements.help.adjustment.example2") || "Productos dañados encontrados: 5 unidades",
        t("movements.help.adjustment.example3") || "Cambio de código de barras o nombre del producto",
        t("movements.help.adjustment.example4") || "Cambio de ubicación en el almacén"
      ],
      important: t("movements.help.adjustment.important") || "IMPORTANTE: Los ajustes deben ser autorizados y documentados. Solo personal autorizado debe realizar ajustes."
    }
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("movements.help.title") || "Ayuda: Tipos de Movimientos"}
      className="max-w-3xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t("movements.help.intro") || "Los movimientos de inventario registran todos los cambios en el stock y propiedades de los productos."}
              </p>
            </div>
          </div>
        </div>

        {helpSections.map((section, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{section.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {section.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {section.description}
                </p>
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("movements.help.whenToUse") || "Cuándo usar:"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {section.whenToUse}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("movements.help.examples") || "Ejemplos:"}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {section.examples.map((example, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-primary-500 mt-1">•</span>
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {section.important && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {section.important}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            {t("common.close") || "Cerrar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

