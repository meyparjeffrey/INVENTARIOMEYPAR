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
  const nameLine = escapeXml(truncate(product.name, 32));
  const barcode = escapeXml(product.barcode ?? '');
  const location = escapeXml(`${product.aisle}-${product.shelf}`);
  const warehouse = escapeXml(product.warehouse ?? '');

  const lineH = Math.max(10, cfg.nameFontPx);
  const xCode = rightX + pxOff(cfg.offsetsMm.code.x);
  const yCode = paddingPx + cfg.codeFontPx + pxOff(cfg.offsetsMm.code.y);

  const xBarcode = rightX + pxOff(cfg.offsetsMm.barcode.x);
  const yBarcode =
    paddingPx + cfg.codeFontPx + 2 + cfg.codeFontPx + pxOff(cfg.offsetsMm.barcode.y);

  const xLocation = rightX + pxOff(cfg.offsetsMm.location.x);
  const yLocation =
    paddingPx +
    cfg.codeFontPx +
    2 +
    cfg.codeFontPx +
    lineH +
    pxOff(cfg.offsetsMm.location.y);

  const xWarehouse = rightX + pxOff(cfg.offsetsMm.warehouse.x);
  const yWarehouse =
    paddingPx +
    cfg.codeFontPx +
    2 +
    cfg.codeFontPx +
    lineH +
    lineH +
    pxOff(cfg.offsetsMm.warehouse.y);

  const xName = rightX + pxOff(cfg.offsetsMm.name.x);
  const yName = heightPx - paddingPx + pxOff(cfg.offsetsMm.name.y);

  const texts: string[] = [];
  if (cfg.showCode) {
    texts.push(
      `<text x="${xCode}" y="${yCode}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}" font-weight="700">${code}</text>`,
    );
  }
  if (cfg.showBarcode && product.barcode) {
    texts.push(
      `<text x="${xBarcode}" y="${yBarcode}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}">${barcode}</text>`,
    );
  }
  if (cfg.showLocation) {
    texts.push(
      `<text x="${xLocation}" y="${yLocation}" font-family="Arial, sans-serif" font-size="${Math.max(9, cfg.nameFontPx - 1)}">${location}</text>`,
    );
  }
  if (cfg.showWarehouse && product.warehouse) {
    texts.push(
      `<text x="${xWarehouse}" y="${yWarehouse}" font-family="Arial, sans-serif" font-size="${Math.max(9, cfg.nameFontPx - 1)}">${warehouse}</text>`,
    );
  }
  if (cfg.showName) {
    texts.push(
      `<text x="${xName}" y="${yName}" font-family="Arial, sans-serif" font-size="${cfg.nameFontPx}" font-weight="600">${nameLine}</text>`,
    );
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
