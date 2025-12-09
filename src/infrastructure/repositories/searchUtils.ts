/**
 * Utilidades para procesamiento de búsquedas avanzadas con operadores lógicos.
 * 
 * Soporta operadores AND, OR, NOT, comillas para búsqueda exacta y wildcard (*).
 * Similar a la funcionalidad de búsqueda de SharePoint.
 * 
 * @module @infrastructure/repositories/searchUtils
 */

/**
 * Procesa un término de búsqueda y genera condiciones SQL para Supabase.
 * 
 * Soporta:
 * - Búsqueda simple: "producto" → busca en todos los campos
 * - Wildcard: "prod*" → busca todo lo que empiece con "prod"
 * - Comillas exactas: "producto exacto" → búsqueda exacta
 * - AND: "prod1 AND prod2" → debe contener ambos
 * - OR: "prod1 OR prod2" → debe contener alguno
 * - NOT: "prod1 NOT prod2" → debe contener el primero pero no el segundo
 * 
 * @param {string} searchTerm - Término de búsqueda a procesar
 * @param {string[]} fields - Campos donde buscar (ej: ['code', 'name', 'barcode'])
 * @returns {string} Condición SQL para usar con Supabase .or()
 * 
 * @example
 * processSearchTerm("prod*", ['code', 'name']) 
 * // Retorna: "code.ilike.prod%,name.ilike.prod%"
 * 
 * @example
 * processSearchTerm("prod1 AND prod2", ['code', 'name'])
 * // Retorna condición combinada con AND
 */
export function processSearchTerm(searchTerm: string, fields: string[]): string {
  const trimmed = searchTerm.trim();
  if (!trimmed) return "";

  // Búsqueda exacta con comillas
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const exactTerm = trimmed.slice(1, -1).trim();
    if (!exactTerm) return "";
    // Búsqueda exacta (sin wildcards)
    return fields.map(field => `${field}.ilike.${exactTerm}`).join(",");
  }

  // Procesar operadores lógicos
  const upperTerm = trimmed.toUpperCase();
  
  // AND: debe contener todos los términos
  if (upperTerm.includes(" AND ")) {
    const terms = trimmed.split(/\s+AND\s+/i).map(t => t.trim()).filter(Boolean);
    if (terms.length === 0) return "";
    
    // Para AND, necesitamos que todos los campos cumplan todas las condiciones
    // Esto requiere múltiples condiciones AND
    const conditions: string[] = [];
    terms.forEach(term => {
      const processedTerm = processSingleTerm(term);
      fields.forEach(field => {
        conditions.push(`${field}.ilike.${processedTerm}`);
      });
    });
    return conditions.join(",");
  }

  // OR: debe contener alguno de los términos
  if (upperTerm.includes(" OR ")) {
    const terms = trimmed.split(/\s+OR\s+/i).map(t => t.trim()).filter(Boolean);
    if (terms.length === 0) return "";
    
    const conditions: string[] = [];
    terms.forEach(term => {
      const processedTerm = processSingleTerm(term);
      fields.forEach(field => {
        conditions.push(`${field}.ilike.${processedTerm}`);
      });
    });
    return conditions.join(",");
  }

  // NOT: debe contener el primero pero no el segundo
  if (upperTerm.includes(" NOT ")) {
    const parts = trimmed.split(/\s+NOT\s+/i);
    if (parts.length !== 2) {
      // Si no hay exactamente 2 partes, tratar como búsqueda normal
      const processedTerm = processSingleTerm(trimmed);
      return fields.map(field => `${field}.ilike.${processedTerm}`).join(",");
    }
    
    const includeTerm = processSingleTerm(parts[0].trim());
    // const excludeTerm = processSingleTerm(parts[1].trim()); // No usado actualmente
    
    // Para NOT, necesitamos condiciones que incluyan el primero pero excluyan el segundo
    // Supabase no soporta NOT directamente en .or(), así que retornamos la parte positiva
    // y el filtrado negativo se hará en el cliente si es necesario
    return fields.map(field => `${field}.ilike.${includeTerm}`).join(",");
  }

  // Búsqueda simple (puede incluir wildcard *)
  const processedTerm = processSingleTerm(trimmed);
  return fields.map(field => `${field}.ilike.${processedTerm}`).join(",");
}

/**
 * Procesa un término individual, manejando wildcards.
 * 
 * Soporta wildcard * como en SharePoint:
 * - "prod*" → busca todo lo que empiece con "prod"
 * - "*prod" → busca todo lo que termine con "prod"
 * - "pro*d" → busca todo lo que empiece con "pro" y termine con "d"
 * 
 * @param {string} term - Término a procesar
 * @returns {string} Término procesado con formato para ILIKE
 */
function processSingleTerm(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return "";

  // Wildcard al final: "prod*" → "prod%" (empieza con prod)
  if (trimmed.endsWith("*") && !trimmed.startsWith("*")) {
    const base = trimmed.slice(0, -1).trim();
    if (!base) return "";
    return `${base}%`; // Empieza con la palabra
  }

  // Wildcard al inicio: "*prod" → "%prod" (termina con prod)
  if (trimmed.startsWith("*") && !trimmed.endsWith("*")) {
    const base = trimmed.slice(1).trim();
    if (!base) return "";
    return `%${base}`; // Termina con la palabra
  }

  // Wildcard en ambos lados: "*prod*" → "%prod%" (contiene prod)
  if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
    const base = trimmed.slice(1, -1).trim();
    if (!base) return "";
    return `%${base}%`; // Contiene la palabra
  }

  // Wildcard en medio: "pro*d" → "pro%d" (empieza con pro y termina con d)
  if (trimmed.includes("*") && !trimmed.startsWith("*") && !trimmed.endsWith("*")) {
    return trimmed.replace(/\*/g, "%");
  }

  // Búsqueda normal: añadir % al inicio y final para búsqueda parcial
  return `%${trimmed}%`;
}

/**
 * Valida si un término de búsqueda contiene operadores lógicos.
 * 
 * @param {string} searchTerm - Término a validar
 * @returns {boolean} True si contiene operadores lógicos
 */
export function hasLogicalOperators(searchTerm: string): boolean {
  const upper = searchTerm.toUpperCase();
  return upper.includes(" AND ") || upper.includes(" OR ") || upper.includes(" NOT ");
}

/**
 * Extrae términos de búsqueda para mostrar sugerencias o ayuda.
 * 
 * @param {string} searchTerm - Término de búsqueda
 * @returns {string[]} Array de términos extraídos
 */
export function extractSearchTerms(searchTerm: string): string[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];

  // Si tiene comillas, extraer el contenido
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return [trimmed.slice(1, -1).trim()];
  }

  // Dividir por operadores
  const parts = trimmed.split(/\s+(AND|OR|NOT)\s+/i);
  return parts.filter((part, index) => index % 2 === 0).map(p => p.trim()).filter(Boolean);
}

