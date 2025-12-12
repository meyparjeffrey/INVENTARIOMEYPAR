/**
 * Utilidades para normalizar y formatear ubicaciones de productos.
 *
 * Proporciona helpers para:
 * - Normalizar códigos de ubicación MEYPAR (p. ej. "1B", "12C").
 * - Convertir el campo `locationExtra` a una lista de ubicaciones adicionales.
 * - Formatear la ubicación completa de un producto para mostrarla en la UI.
 *
 * @module @presentation/utils/locationUtils
 */
import type { Product } from '@domain/entities';

const MEYPAR_LOCATION_REGEX = /^(\d{1,2})\s*([A-Ga-g])$/;

/**
 * Normaliza un código de ubicación MEYPAR a formato `número + letra` (ej: "1B").
 *
 * @param {string} rawCode - Código introducido por el usuario.
 * @returns {string | null} Código normalizado o null si no es válido.
 */
export function normalizeMeyparLocationCode(rawCode: string): string | null {
  if (!rawCode) return null;
  const trimmed = rawCode.trim();
  const match = trimmed.match(MEYPAR_LOCATION_REGEX);
  if (!match) return null;

  const numberPart = match[1];
  const letterPart = match[2].toUpperCase();
  return `${numberPart}${letterPart}`;
}

/**
 * Convierte `locationExtra` en una lista de ubicaciones adicionales.
 *
 * Acepta:
 * - JSON string con un array (ej: '["1B","2C"]').
 * - Listas separadas por coma o punto y coma (ej: "1B,2C" o "1B; 2C").
 *
 * @param {string | null | undefined} raw - Valor almacenado en `locationExtra`.
 * @returns {string[]} Lista normalizada sin duplicados.
 */
export function parseAdditionalLocations(raw?: string | null): string[] {
  if (!raw) return [];
  const cleaned = raw.trim();
  if (!cleaned) return [];

  let candidates: string[] = [];

  // Intentar parsear JSON primero
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        candidates = parsed.map((item) => String(item));
      }
    } catch {
      // Ignorar error y continuar con parsing manual
    }
  }

  if (candidates.length === 0) {
    candidates = cleaned.split(/[;,]/).map((item) => item.trim());
  }

  const normalized = candidates
    .map((code) => normalizeMeyparLocationCode(code))
    .filter((code): code is string => Boolean(code));

  return Array.from(new Set(normalized));
}

/**
 * Serializa la lista de ubicaciones adicionales para guardarla en `location_extra`.
 *
 * @param {string[]} locations - Lista de ubicaciones normalizadas.
 * @returns {string | null} Cadena lista para persistir o null si no hay valores.
 */
export function stringifyAdditionalLocations(locations: string[]): string | null {
  if (!locations.length) return null;
  return locations.join(',');
}

/**
 * Construye la etiqueta de ubicación a mostrar para un producto.
 *
 * Para MEYPAR incluye la ubicación principal y las adicionales separadas por "·".
 * Para FURGONETA muestra el nombre del técnico si está en `locationExtra`.
 *
 * @param {Product} product - Producto a formatear.
 * @returns {string} Ubicación lista para UI.
 */
export function formatProductLocation(product: Product): string {
  if (product.warehouse === 'MEYPAR') {
    const baseLocation = `${product.aisle ?? ''}${product.shelf ?? ''}`.trim();
    const extras = parseAdditionalLocations(product.locationExtra);
    const segments = [baseLocation, ...extras].filter(Boolean);
    return segments.length ? segments.join(' · ') : '-';
  }

  if (product.warehouse === 'OLIVA_TORRAS') {
    return 'Oliva Torras';
  }

  if (product.warehouse === 'FURGONETA' && product.locationExtra) {
    const match = product.locationExtra.match(/Furgoneta\s+(.+)/);
    return match ? match[1] : product.locationExtra;
  }

  const fallback = `${product.aisle ?? ''}${product.shelf ?? ''}`.trim();
  return fallback || product.locationExtra || '-';
}


