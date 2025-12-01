import * as React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Definición de un atajo de teclado
 */
export interface KeyboardShortcut {
  /** Tecla principal (ej: "n", "s", "Escape") */
  key: string;
  /** Requiere Ctrl/Cmd */
  ctrl?: boolean;
  /** Requiere Shift */
  shift?: boolean;
  /** Requiere Alt */
  alt?: boolean;
  /** Acción a ejecutar */
  action: () => void;
  /** Descripción del atajo */
  description: string;
  /** Grupo al que pertenece */
  group?: string;
  /** Deshabilitado cuando hay un input activo */
  disableInInput?: boolean;
}

/**
 * Hook para registrar atajos de teclado globales
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detectar si estamos en un input/textarea
      const isInInput = 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      for (const shortcut of shortcuts) {
        // Verificar modificadores
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          // Si está deshabilitado en inputs, no ejecutar
          if (shortcut.disableInInput && isInInput) {
            continue;
          }

          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook que proporciona atajos de teclado globales de la aplicación
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = React.useMemo(() => [
    // Navegación
    {
      key: "d",
      ctrl: true,
      action: () => navigate("/dashboard"),
      description: "Ir al Dashboard",
      group: "Navegación",
      disableInInput: true
    },
    {
      key: "p",
      ctrl: true,
      shift: true,
      action: () => navigate("/products"),
      description: "Ir a Productos",
      group: "Navegación"
    },
    {
      key: "m",
      ctrl: true,
      shift: true,
      action: () => navigate("/movements"),
      description: "Ir a Movimientos",
      group: "Navegación"
    },
    {
      key: "b",
      ctrl: true,
      shift: true,
      action: () => navigate("/batches"),
      description: "Ir a Lotes",
      group: "Navegación"
    },
    {
      key: "a",
      ctrl: true,
      shift: true,
      action: () => navigate("/alarms"),
      description: "Ir a Alarmas",
      group: "Navegación"
    },
    {
      key: "Escape",
      action: () => {
        // Cerrar modales/dropdowns abiertos
        const event = new CustomEvent("closeModals");
        window.dispatchEvent(event);
      },
      description: "Cerrar modal/dropdown",
      group: "General"
    }
  ], [navigate]);

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

/**
 * Hook para mostrar/ocultar el panel de atajos
 */
export function useShortcutsPanel() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + /
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape para cerrar
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return { isOpen, setIsOpen, toggle: () => setIsOpen((prev) => !prev) };
}

