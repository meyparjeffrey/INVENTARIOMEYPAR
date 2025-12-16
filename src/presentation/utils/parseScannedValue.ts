export function parseScannedValue(raw: string): {
  raw: string;
  lookupKey: string;
} {
  const cleaned = raw.trim();
  if (!cleaned) return { raw: '', lookupKey: '' };

  // Algunos lectores USB/HID pueden mapear la tecla de '|' a otros caracteres en teclados ES (p.ej. 'º').
  // También es común encontrar separadores visualmente "similares" en algunos sistemas.
  // Aceptamos varios separadores equivalentes y nos quedamos con el código (antes del separador).
  const SEPARATORS = [
    '|',
    '｜', // fullwidth vertical line
    '∣', // mathematical divides
    'º', // teclado ES: a veces se recibe en lugar de '|'
    '°',
    '¦',
    '│',
    '┃',
    '︱',
    'ǀ',
    '\u001d', // GS (group separator) típico en algunos escáneres
  ];

  // Evitar problemas por saltos de línea/tabulaciones y marcas de dirección (a veces añadidas por algunos lectores).
  // OJO: no eliminamos otros separadores de control (p.ej. GS \u001d) porque pueden ser relevantes.
  const printable = cleaned
    .replace(/[\r\n\t]/g, '')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();

  let idx = -1;
  for (const sep of SEPARATORS) {
    const i = printable.indexOf(sep);
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }

  // Formato nuevo: CODE|NAME_TRUNC (sin saltos de línea para máxima compatibilidad HID/USB)
  if (idx >= 0) {
    const code = printable.slice(0, idx).trim();
    return { raw: printable, lookupKey: code || printable };
  }

  // Formato legacy: barcode/código directo
  return { raw: printable, lookupKey: printable };
}
