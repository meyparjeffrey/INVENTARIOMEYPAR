/**
 * Opciones disponibles para elementos por página.
 * 
 * Estas opciones se usan en:
 * - Tabla de productos (selector de paginación)
 * - Página de configuración (preferencias)
 * 
 * @module @presentation/constants/pageSizeOptions
 */

/**
 * Opciones válidas para elementos por página.
 * Todas las páginas que usen paginación deben usar estas opciones para mantener consistencia.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500] as const;

/**
 * Valor por defecto para elementos por página.
 */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Valida si un valor es una opción válida de elementos por página.
 * 
 * @param {number} value - Valor a validar
 * @returns {boolean} True si el valor es una opción válida
 */
export function isValidPageSize(value: number): boolean {
  return PAGE_SIZE_OPTIONS.includes(value as typeof PAGE_SIZE_OPTIONS[number]);
}

/**
 * Obtiene el valor más cercano válido si el valor proporcionado no está en las opciones.
 * 
 * @param {number} value - Valor a normalizar
 * @returns {number} Valor válido más cercano
 */
export function normalizePageSize(value: number): number {
  if (isValidPageSize(value)) {
    return value;
  }
  
  // Encontrar el valor más cercano
  const closest = PAGE_SIZE_OPTIONS.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
  });
  
  return closest;
}

