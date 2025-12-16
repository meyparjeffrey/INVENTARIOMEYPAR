import type { Product } from '@domain/entities';

export type LabelConfig = {
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300 | 600;
  showQr: boolean;
  showCode: boolean;
  showBarcode: boolean;
  showName: boolean;
  showWarehouse: boolean;
  showLocation: boolean;
  qrSizeMm: number;
  paddingMm: number;
  codeFontPx: number;
  barcodeFontPx: number;
  locationFontPx: number;
  warehouseFontPx: number;
  nameFontPx: number;
  nameMaxLines: number; // p.ej. 1-3
  barcodeBold: boolean;
  locationBold: boolean;
  warehouseBold: boolean;
  nameBold: boolean;
  offsetsMm: {
    qr: { x: number; y: number };
    code: { x: number; y: number };
    barcode: { x: number; y: number };
    location: { x: number; y: number };
    warehouse: { x: number; y: number };
    name: { x: number; y: number };
  };
};

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

function escapeXml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

function estimateTextPxWidth(text: string, fontPx: number, isBold: boolean) {
  // Aproximación: ancho medio por carácter
  const perChar = fontPx * (isBold ? 0.6 : 0.56);
  return text.length * perChar;
}

function wrapTextToLines(opts: {
  text: string;
  maxWidthPx: number;
  fontPx: number;
  isBold: boolean;
  maxLines: number;
}): string[] {
  const { text, maxWidthPx, fontPx, isBold, maxLines } = opts;
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return [];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (line) lines.push(line);
  };

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (estimateTextPxWidth(next, fontPx, isBold) <= maxWidthPx) {
      current = next;
      continue;
    }

    if (!current) {
      // Palabra demasiado larga: cortar por caracteres
      let chunk = '';
      for (const ch of w) {
        const cand = `${chunk}${ch}`;
        if (estimateTextPxWidth(cand, fontPx, isBold) <= maxWidthPx) {
          chunk = cand;
        } else {
          pushLine(chunk);
          chunk = ch;
          if (lines.length >= maxLines) break;
        }
      }
      if (lines.length < maxLines) pushLine(chunk);
      current = '';
    } else {
      pushLine(current);
      current = w;
    }

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) pushLine(current);

  // Si sobra texto, elipsis en la última línea
  if (lines.length > 0) {
    const limited = lines.slice(0, Math.max(1, maxLines));
    if (limited.length === maxLines) {
      const last = limited[limited.length - 1];
      // Asegurar que cabe con elipsis
      if (estimateTextPxWidth(last, fontPx, isBold) > maxWidthPx) {
        limited[limited.length - 1] = truncate(last, Math.max(1, last.length - 1));
      }
      if (
        !last.endsWith('…') &&
        words.join(' ').startsWith(limited.join(' ')) === false
      ) {
        // ya hay truncado (heurístico); si no, añadimos elipsis si hace falta
        if (!limited[limited.length - 1].endsWith('…')) {
          limited[limited.length - 1] = truncate(
            limited[limited.length - 1],
            Math.max(1, limited[limited.length - 1].length),
          );
        }
      }
    }
    return limited;
  }

  return [];
}

/**
 * Construye un SVG de etiqueta (plantilla base) que luego puede convertirse a PNG.
 * `qrDataUrl` debe ser un dataURL local (evita CORS al rasterizar).
 */
export function buildLabelSvg(
  product: Product,
  qrDataUrl: string | null,
  cfg: LabelConfig,
): string {
  const widthPx = mmToPx(cfg.widthMm, cfg.dpi);
  const heightPx = mmToPx(cfg.heightMm, cfg.dpi);
  const qrSizePx = mmToPx(cfg.qrSizeMm, cfg.dpi);
  const paddingPx = mmToPx(cfg.paddingMm, cfg.dpi);

  const pxOff = (mm: number) => mmToPx(mm, cfg.dpi);

  const rightX = paddingPx + (cfg.showQr ? qrSizePx + paddingPx : 0);
  const xQr = paddingPx + pxOff(cfg.offsetsMm.qr.x);
  const yQr = paddingPx + pxOff(cfg.offsetsMm.qr.y);

  const code = escapeXml(product.code);
  const barcode = escapeXml(product.barcode ?? '');
  const location = escapeXml(`${product.aisle}-${product.shelf}`);
  const warehouse = escapeXml(product.warehouse ?? '');

  const xName = rightX + pxOff(cfg.offsetsMm.name.x);
  const yName = heightPx - paddingPx + pxOff(cfg.offsetsMm.name.y);

  const texts: string[] = [];

  // Bloque superior apilado (code/barcode/location/warehouse)
  let yCursor = paddingPx;
  if (cfg.showCode) {
    yCursor += cfg.codeFontPx;
    const x = rightX + pxOff(cfg.offsetsMm.code.x);
    const y = yCursor + pxOff(cfg.offsetsMm.code.y);
    texts.push(
      `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}" font-weight="700">${code}</text>`,
    );
    yCursor += 2;
  }
  if (cfg.showBarcode && product.barcode) {
    yCursor += cfg.barcodeFontPx;
    const x = rightX + pxOff(cfg.offsetsMm.barcode.x);
    const y = yCursor + pxOff(cfg.offsetsMm.barcode.y);
    texts.push(
      `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${cfg.barcodeFontPx}" font-weight="${cfg.barcodeBold ? 700 : 400}">${barcode}</text>`,
    );
    yCursor += 2;
  }
  if (cfg.showLocation) {
    yCursor += cfg.locationFontPx;
    const x = rightX + pxOff(cfg.offsetsMm.location.x);
    const y = yCursor + pxOff(cfg.offsetsMm.location.y);
    texts.push(
      `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${cfg.locationFontPx}" font-weight="${cfg.locationBold ? 700 : 400}">${location}</text>`,
    );
    yCursor += 2;
  }
  if (cfg.showWarehouse && product.warehouse) {
    yCursor += cfg.warehouseFontPx;
    const x = rightX + pxOff(cfg.offsetsMm.warehouse.x);
    const y = yCursor + pxOff(cfg.offsetsMm.warehouse.y);
    texts.push(
      `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${cfg.warehouseFontPx}" font-weight="${cfg.warehouseBold ? 700 : 400}">${warehouse}</text>`,
    );
    yCursor += 2;
  }

  // Nombre: wrap a líneas según ancho disponible, anclado al fondo
  if (cfg.showName) {
    const rightLimit = widthPx - paddingPx;
    const maxWidthPx = Math.max(10, rightLimit - xName);
    const lines = wrapTextToLines({
      text: product.name,
      maxWidthPx,
      fontPx: cfg.nameFontPx,
      isBold: cfg.nameBold,
      maxLines: Math.max(1, Math.min(5, cfg.nameMaxLines)),
    }).map(escapeXml);

    if (lines.length > 0) {
      const lineH = cfg.nameFontPx + 2;
      const yLast = yName;
      const yFirst = yLast - (lines.length - 1) * lineH;
      const weight = cfg.nameBold ? 700 : 600; // nombre por defecto semibold; si no bold, 600
      const tspans = lines
        .map((ln, i) => {
          const yy = yFirst + i * lineH;
          return `<tspan x="${xName}" y="${yy}">${ln}</tspan>`;
        })
        .join('');
      texts.push(
        `<text font-family="Arial, sans-serif" font-size="${cfg.nameFontPx}" font-weight="${weight}">${tspans}</text>`,
      );
    }
  }

  const qrImage =
    cfg.showQr && qrDataUrl
      ? `<image href="${qrDataUrl}" x="${xQr}" y="${yQr}" width="${qrSizePx}" height="${qrSizePx}" />`
      : '';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">` +
    `<rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="#FFFFFF" />` +
    `${qrImage}` +
    `<g fill="#000000">${texts.join('')}</g>` +
    `</svg>`
  );
}
