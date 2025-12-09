import * as React from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

/**
 * Hook para gestionar atajos de teclado en la aplicación.
 */
/**
 * Hook para gestionar atajos de teclado en la aplicación.
 * 
 * No ejecuta atajos cuando el usuario está escribiendo en un input, textarea o contenteditable.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // No ejecutar atajos si el usuario está escribiendo en un campo de texto
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable ||
        (target.tagName === "DIV" && target.getAttribute("role") === "textbox");

      if (isInputField) {
        return; // No ejecutar atajos cuando se está escribiendo
      }

      shortcuts.forEach((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
}
