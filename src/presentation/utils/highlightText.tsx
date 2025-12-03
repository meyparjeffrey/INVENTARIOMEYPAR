import * as React from "react";

/**
 * Resalta las coincidencias de un término de búsqueda en un texto.
 * Las letras coincidentes aparecen en negrita.
 * 
 * @param text - Texto donde buscar
 * @param searchTerm - Término de búsqueda
 * @returns Array de elementos React con las coincidencias resaltadas
 */
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || !text) {
    return text;
  }

  // Escapar caracteres especiales de regex
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedTerm})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // Si la parte coincide con el término de búsqueda (case-insensitive)
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <strong key={index} className="font-bold text-gray-900 dark:text-gray-50">
          {part}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

