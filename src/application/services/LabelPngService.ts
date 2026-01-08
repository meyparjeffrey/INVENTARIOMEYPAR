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

export function estimateTextPxWidth(text: string, fontPx: number, isBold: boolean) {
  // Aproximación mejorada: ancho medio por carácter
  // Arial bold: aproximadamente 0.6-0.65 veces el tamaño de fuente
  // Usar un factor ligeramente más alto para ser conservador y evitar desbordes
  // El factor más alto hace que el algoritmo sea más agresivo al dividir líneas
  const perChar = fontPx * (isBold ? 0.65 : 0.55);
  return text.length * perChar;
}

export function wrapTextToLines(opts: {
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

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = current ? `${current} ${w}` : w;
    const nextWidth = estimateTextPxWidth(next, fontPx, isBold);

    // Si la palabra completa cabe, añadirla
    if (nextWidth <= maxWidthPx) {
      current = next;
      continue;
    }

    // Si no cabe, solo dividir por palabras completas
    if (!current) {
      // Palabra sola que no cabe: solo dividir por caracteres si es extremadamente larga
      // (más larga que el ancho disponible incluso sola)
      const wordAloneWidth = estimateTextPxWidth(w, fontPx, isBold);
      if (wordAloneWidth > maxWidthPx) {
        // Palabra extremadamente larga: dividir por caracteres (caso excepcional)
        let chunk = '';
        for (const ch of w) {
          const cand = `${chunk}${ch}`;
          if (estimateTextPxWidth(cand, fontPx, isBold) <= maxWidthPx) {
            chunk = cand;
          } else {
            if (chunk && lines.length < maxLines) {
              pushLine(chunk);
            }
            chunk = ch;
            if (lines.length >= maxLines) break;
          }
        }
        if (lines.length < maxLines && chunk) {
          pushLine(chunk);
        }
        current = '';
      } else {
        // Palabra que no cabe sola pero no es extremadamente larga: ponerla en siguiente línea
        // (esto no debería pasar normalmente, pero por seguridad)
        if (lines.length < maxLines) {
          pushLine(w);
        }
        current = '';
      }
    } else {
      // Tenemos texto actual, pero la siguiente palabra no cabe completa
      // REGLA: Si una palabra no cabe completa, bajar toda la palabra a la siguiente línea
      // NO dividir palabras por caracteres
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

  // Posiciones usando el mismo sistema que la vista previa interactiva
  const xQr = paddingPx + pxOff(cfg.offsetsMm.qr.x);
  const yQr = paddingPx + pxOff(cfg.offsetsMm.qr.y);

  const code = escapeXml(product.code);
  const barcode = escapeXml(product.barcode ?? '');
  const location = escapeXml(`${product.aisle}-${product.shelf}`);
  const warehouse = escapeXml(product.warehouse ?? '');

  // Código: posición absoluta desde paddingPx (igual que en vista previa)
  const xCode = paddingPx + pxOff(cfg.offsetsMm.code.x);
  const yCode = paddingPx + pxOff(cfg.offsetsMm.code.y);

  // Nombre: posición absoluta desde paddingPx (igual que en vista previa)
  const xName = paddingPx + pxOff(cfg.offsetsMm.name.x);
  const yName = paddingPx + pxOff(cfg.offsetsMm.name.y);

  const texts: string[] = [];

  // Verificar si las dimensiones son las estándar MULTI3 (70x25.4mm)
  // Solo aplicar restricciones de posicionamiento en este caso para el PDF
  const isStandardMulti3 =
    Math.abs(cfg.widthMm - 70) < 0.1 && Math.abs(cfg.heightMm - 25.4) < 0.1;

  // Código: aplicar restricciones solo si es MULTI3 estándar
  if (cfg.showCode) {
    let codeX = xCode;
    let codeAnchor = 'start';

    if (isStandardMulti3 && cfg.showName) {
      // Para MULTI3 estándar: centrar código con nombre, no tocar QR
      const qrRightEdge = cfg.showQr ? xQr + qrSizePx : 0;
      const marginBetweenQrAndText = mmToPx(1, cfg.dpi);
      const containerLeft = Math.max(xName, qrRightEdge + marginBetweenQrAndText);
      const rightMargin = mmToPx(1, cfg.dpi);
      const containerRight = widthPx - paddingPx - rightMargin;
      // Centrar código en el mismo punto que el nombre
      codeX = containerLeft + (containerRight - containerLeft) / 2;
      codeAnchor = 'middle';
    }

    texts.push(
      `<text x="${codeX}" y="${yCode}" font-family="Arial, sans-serif" font-size="${cfg.codeFontPx}" font-weight="700" dominant-baseline="hanging" text-anchor="${codeAnchor}">${code}</text>`,
    );
  }

  // Barcode: posición relativa al código (mantener compatibilidad)
  if (cfg.showBarcode && product.barcode) {
    const xBarcode = paddingPx + pxOff(cfg.offsetsMm.barcode.x);
    const yBarcode = paddingPx + pxOff(cfg.offsetsMm.barcode.y);
    texts.push(
      `<text x="${xBarcode}" y="${yBarcode}" font-family="Arial, sans-serif" font-size="${cfg.barcodeFontPx}" font-weight="${cfg.barcodeBold ? 700 : 400}" dominant-baseline="text-before-edge" text-anchor="start">${barcode}</text>`,
    );
  }

  // Ubicación: posición absoluta
  if (cfg.showLocation) {
    const xLocation = paddingPx + pxOff(cfg.offsetsMm.location.x);
    const yLocation = paddingPx + pxOff(cfg.offsetsMm.location.y);
    texts.push(
      `<text x="${xLocation}" y="${yLocation}" font-family="Arial, sans-serif" font-size="${cfg.locationFontPx}" font-weight="${cfg.locationBold ? 700 : 400}" dominant-baseline="text-before-edge" text-anchor="start">${location}</text>`,
    );
  }

  // Almacén: posición absoluta
  if (cfg.showWarehouse && product.warehouse) {
    const xWarehouse = paddingPx + pxOff(cfg.offsetsMm.warehouse.x);
    const yWarehouse = paddingPx + pxOff(cfg.offsetsMm.warehouse.y);
    texts.push(
      `<text x="${xWarehouse}" y="${yWarehouse}" font-family="Arial, sans-serif" font-size="${cfg.warehouseFontPx}" font-weight="${cfg.warehouseBold ? 700 : 400}" dominant-baseline="text-before-edge" text-anchor="start">${warehouse}</text>`,
    );
  }

  // Nombre: aplicar restricciones solo si es MULTI3 estándar
  if (cfg.showName) {
    let containerLeft: number;
    let containerRight: number;
    let availableWidth: number;
    let centerX: number;

    if (isStandardMulti3) {
      // Para MULTI3 estándar: no tocar QR, centrado con código
      const qrRightEdge = cfg.showQr ? xQr + qrSizePx : 0;
      const marginBetweenQrAndText = mmToPx(1, cfg.dpi);
      containerLeft = Math.max(xName, qrRightEdge + marginBetweenQrAndText);
      const rightMargin = mmToPx(1, cfg.dpi);
      containerRight = widthPx - paddingPx - rightMargin;
      // Reducir un 15% adicional para asegurar que el texto centrado no se salga de los límites
      availableWidth = Math.max(10, (containerRight - containerLeft) * 0.85);
      centerX = containerLeft + (containerRight - containerLeft) / 2;
    } else {
      // Para otras dimensiones: movimiento libre
      const rightMargin = mmToPx(1, cfg.dpi);
      containerLeft = xName;
      containerRight = widthPx - paddingPx - rightMargin;
      availableWidth = Math.max(10, (containerRight - containerLeft) * 0.95);
      centerX = containerLeft + (containerRight - containerLeft) / 2;
    }

    const lines = wrapTextToLines({
      text: product.name,
      maxWidthPx: availableWidth,
      fontPx: cfg.nameFontPx,
      isBold: cfg.nameBold,
      maxLines: Math.max(1, Math.min(5, cfg.nameMaxLines)),
    }).map(escapeXml);

    if (lines.length > 0) {
      const lineH = cfg.nameFontPx + 2;
      const weight = cfg.nameBold ? 700 : 600;
      // Centrar cada línea en el espacio disponible
      const tspans = lines
        .map((ln, i) => {
          const yy = yName + i * lineH;
          return `<tspan x="${centerX}" y="${yy}" text-anchor="middle">${ln}</tspan>`;
        })
        .join('');
      texts.push(
        `<text font-family="Arial, sans-serif" font-size="${cfg.nameFontPx}" font-weight="${weight}" dominant-baseline="text-before-edge">${tspans}</text>`,
      );
    }
  }

  const qrImage =
    cfg.showQr && qrDataUrl
      ? `<image href="${qrDataUrl}" x="${xQr}" y="${yQr}" width="${qrSizePx}" height="${qrSizePx}" />`
      : '';

  // Generar SVG sin fondo (transparente) para que coincida exactamente con la vista previa
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">` +
    `${qrImage}` +
    `<g fill="#000000">${texts.join('')}</g>` +
    `</svg>`
  );
}
