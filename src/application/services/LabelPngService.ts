import type { Product } from '@domain/entities';

export type LabelConfig = {
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300;
  showQr: boolean;
  showCode: boolean;
  showBarcode: boolean;
  showName: boolean;
  showWarehouse: boolean;
  showLocation: boolean;
  qrSizeMm: number;
  paddingMm: number;
  codeFontPx: number;
  nameFontPx: number;
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

  const rightX = paddingPx + (cfg.showQr ? qrSizePx + paddingPx : 0);

  const code = escapeXml(product.code);
  const nameLine = escapeXml(truncate(product.name, 32));
  const barcode = escapeXml(product.barcode ?? '');
  const location = escapeXml(
    `${product.aisle}-${product.shelf}${product.warehouse ? ` (${product.warehouse})` : ''}`,
  );

  const yCode = paddingPx + cfg.codeFontPx;
  const yBarcode = yCode + cfg.codeFontPx + 2;
  const yLocation = yBarcode + Math.max(10, cfg.nameFontPx);
  const yName = heightPx - paddingPx;

  const topLines: string[] = [];
  if (cfg.showCode) {
    topLines.push(
      `<text x="${rightX}" y="${yCode}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}" font-weight="700">${code}</text>`,
    );
  }
  if (cfg.showBarcode && product.barcode) {
    topLines.push(
      `<text x="${rightX}" y="${yBarcode}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}">${barcode}</text>`,
    );
  }
  if (cfg.showLocation) {
    topLines.push(
      `<text x="${rightX}" y="${yLocation}" font-family="Arial, sans-serif" font-size="${Math.max(9, cfg.nameFontPx - 1)}">${location}</text>`,
    );
  }
  if (cfg.showWarehouse && product.warehouse) {
    // warehouse ya va incluido en location, pero el toggle permite repetirlo si se quiere explícito
    topLines.push(
      `<text x="${rightX}" y="${yLocation + Math.max(9, cfg.nameFontPx - 1) + 2}" font-family="Arial, sans-serif" font-size="${Math.max(9, cfg.nameFontPx - 1)}">${escapeXml(product.warehouse)}</text>`,
    );
  }

  const nameText = cfg.showName
    ? `<text x="${rightX}" y="${yName}" font-family="Arial, sans-serif" font-size="${cfg.nameFontPx}" font-weight="600">${nameLine}</text>`
    : '';

  const qrImage =
    cfg.showQr && qrDataUrl
      ? `<image href="${qrDataUrl}" x="${paddingPx}" y="${paddingPx}" width="${qrSizePx}" height="${qrSizePx}" />`
      : '';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">` +
    `<rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="#FFFFFF" />` +
    `${qrImage}` +
    `<g fill="#000000">${topLines.join('')}${nameText}</g>` +
    `</svg>`
  );
}
