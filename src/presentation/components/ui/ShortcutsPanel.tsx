import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

interface ShortcutItem {
  keys: string[];
  description: string;
  group?: string;
}

interface ShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lista de atajos disponibles
 */
const SHORTCUTS: ShortcutItem[] = [
  // Navegación
  { keys: ["Ctrl", "D"], description: "Ir al Dashboard", group: "Navegación" },
  { keys: ["Ctrl", "Shift", "P"], description: "Ir a Productos", group: "Navegación" },
  { keys: ["Ctrl", "Shift", "M"], description: "Ir a Movimientos", group: "Navegación" },
  { keys: ["Ctrl", "Shift", "B"], description: "Ir a Lotes", group: "Navegación" },
  { keys: ["Ctrl", "Shift", "A"], description: "Ir a Alarmas", group: "Navegación" },
  { keys: ["Ctrl", "K"], description: "Búsqueda global", group: "Navegación" },
  
  // Acciones
  { keys: ["Ctrl", "N"], description: "Nuevo producto", group: "Acciones" },
  { keys: ["Ctrl", "S"], description: "Guardar cambios", group: "Acciones" },
  { keys: ["Ctrl", "E"], description: "Exportar datos", group: "Acciones" },
  
  // General
  { keys: ["Esc"], description: "Cerrar modal/dropdown", group: "General" },
  { keys: ["Ctrl", "/"], description: "Mostrar atajos de teclado", group: "General" },
  { keys: ["F11"], description: "Pantalla completa", group: "General" }
];

/**
 * Panel de ayuda de atajos de teclado
 */
export function ShortcutsPanel({ isOpen, onClose }: ShortcutsPanelProps) {
  const { t } = useLanguage();
  
  // Agrupar atajos
  const groups = React.useMemo(() => {
    const grouped = new Map<string, ShortcutItem[]>();
    SHORTCUTS.forEach((shortcut) => {
      const group = shortcut.group || "General";
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(shortcut);
    });
    return grouped;
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
                  <Keyboard className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {t("shortcuts.title") || "Atajos de Teclado"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("shortcuts.subtitle") || "Navega más rápido con atajos"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {Array.from(groups.entries()).map(([groupName, shortcuts]) => (
                  <div key={groupName}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {groupName}
                    </h3>
                    <div className="space-y-2">
                      {shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shortcut.description}
                          </span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, keyIdx) => (
                              <React.Fragment key={keyIdx}>
                                <kbd
                                  className={cn(
                                    "inline-flex min-w-[1.75rem] items-center justify-center rounded-md",
                                    "border border-gray-300 bg-white px-2 py-1",
                                    "text-xs font-medium text-gray-700 shadow-sm",
                                    "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  )}
                                >
                                  {key}
                                </kbd>
                                {keyIdx < shortcut.keys.length - 1 && (
                                  <span className="text-xs text-gray-400">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {t("shortcuts.hint") || "Presiona"}{" "}
                <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700">
                  /
                </kbd>{" "}
                {t("shortcuts.toToggle") || "para mostrar/ocultar este panel"}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Botón flotante para mostrar los atajos
 */
export function ShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-4 left-4 z-40 hidden md:flex",
        "items-center gap-2 rounded-full",
        "border border-gray-200 bg-white px-4 py-2 shadow-lg",
        "text-sm text-gray-600 transition",
        "hover:border-primary-300 hover:text-primary-600",
        "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
        "dark:hover:border-primary-600 dark:hover:text-primary-400"
      )}
      title="Atajos de teclado (Ctrl + /)"
    >
      <Keyboard className="h-4 w-4" />
      <span className="hidden lg:inline">Ctrl + /</span>
    </button>
  );
}

