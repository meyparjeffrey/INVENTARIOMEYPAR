export function parseScannedValue(raw: string): {
  raw: string;
  lookupKey: string;
} {
  const cleaned = raw.trim();
  if (!cleaned) return { raw: '', lookupKey: '' };

  // Formato nuevo: CODE|NAME_TRUNC (sin saltos de línea para máxima compatibilidad HID/USB)
  const idx = cleaned.indexOf('|');
  if (idx >= 0) {
    const code = cleaned.slice(0, idx).trim();
    return { raw: cleaned, lookupKey: code || cleaned };
  }

  // Formato legacy: barcode/código directo
  return { raw: cleaned, lookupKey: cleaned };
}
