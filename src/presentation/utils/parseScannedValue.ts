/**
 * Separadores reconocidos para QR/escáner.
 * Algunos lectores USB/HID mapean '|' a otros caracteres dependiendo del layout de teclado.
 */
const SEPARATORS = [
  '|', // ASCII pipe (el que usamos al generar el QR) - charCode 124
  '｜', // fullwidth vertical line U+FF5C
  '∣', // mathematical divides U+2223
  'º', // teclado ES: a veces se recibe en lugar de '|' - charCode 186
  '°', // degree sign U+00B0 - charCode 176
  '¦', // broken bar U+00A6 - charCode 166
  '│', // box drawings light vertical U+2502
  '┃', // box drawings heavy vertical U+2503
  '︱', // presentation form for vertical em dash U+FE31
  'ǀ', // latin letter dental click U+01C0
  '\u001d', // GS (group separator) típico en algunos escáneres industriales
  '\u001c', // FS (file separator)
  '\u001e', // RS (record separator)
  '\u001f', // US (unit separator)
];

// CharCodes adicionales que actúan como separadores pero no están en la lista de strings
const SEPARATOR_CHAR_CODES = new Set([
  124, // |
  166, // ¦
  176, // °
  186, // º
  9474, // │
  9475, // ┃
  65372, // ｜
  8739, // ∣
  65073, // ︱
  448, // ǀ
  29, // GS
  28, // FS
  30, // RS
  31, // US
]);

/**
 * Parsea un valor escaneado (QR / barcode / teclado) y extrae el `lookupKey` (código) para búsqueda.
 *
 * Formato esperado: `CODE|NAME_TRUNC` o simplemente `CODE`.
 *
 * @example
 * parseScannedValue('MPE50-30124|ADPATADOR CARRIL DIN para MTX-T')
 * // => { raw: 'MPE50-30124|ADPATADOR CARRIL DIN para MTX-T', lookupKey: 'MPE50-30124' }
 */
export function parseScannedValue(raw: string): {
  raw: string;
  lookupKey: string;
} {
  const cleaned = raw.trim();
  if (!cleaned) return { raw: '', lookupKey: '' };

  // Limpiar caracteres invisibles / de control que pueden añadirse por escáneres o copiar/pegar.
  // Mantenemos solo caracteres imprimibles y separadores reconocidos (GS, FS, RS, US).
  const printable = cleaned
    .replace(/^\uFEFF/, '') // BOM
    .replace(/[\r\n\t]/g, '') // saltos de línea, tabs
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '') // marcas de dirección
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      // Mantener separadores de control relevantes para escáneres (GS, FS, RS, US)
      if (code >= 28 && code <= 31) return true;
      // Eliminar otros caracteres de control (0-8, 11, 12, 14-27)
      if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 27))
        return false;
      return true;
    })
    .join('')
    .trim();

  // Método 1: Buscar por string en lista de separadores conocidos
  let idx = -1;
  let foundSep: string | null = null;
  for (const sep of SEPARATORS) {
    const i = printable.indexOf(sep);
    if (i >= 0 && (idx < 0 || i < idx)) {
      idx = i;
      foundSep = sep;
    }
  }

  // Método 2 (fallback): Si no encontramos separador por string, buscar por charCode
  // Esto captura casos donde el escáner envía un carácter con encoding diferente
  if (idx < 0) {
    for (let i = 0; i < printable.length; i++) {
      const code = printable.charCodeAt(i);
      if (SEPARATOR_CHAR_CODES.has(code)) {
        idx = i;
        foundSep = `[charCode:${code}]`;
        break;
      }
    }
  }

  // DEBUG: log para diagnosticar problemas de escáner en producción
  // eslint-disable-next-line no-console
  console.log('[parseScannedValue]', {
    raw: raw.slice(0, 80),
    printable: printable.slice(0, 80),
    separatorFound: foundSep,
    separatorIndex: idx,
    charCodes: printable
      .slice(0, 40)
      .split('')
      .map((c) => c.charCodeAt(0)),
  });

  // Formato QR: CODE|NAME_TRUNC → extraer CODE
  if (idx >= 0) {
    const code = printable.slice(0, idx).trim();
    const lookupKey = code || printable;
    // eslint-disable-next-line no-console
    console.log('[parseScannedValue] Resultado:', { lookupKey });
    return { raw: printable, lookupKey };
  }

  // Formato legacy: barcode/código directo
  // eslint-disable-next-line no-console
  console.log('[parseScannedValue] Resultado (sin separador):', { lookupKey: printable });
  return { raw: printable, lookupKey: printable };
}
