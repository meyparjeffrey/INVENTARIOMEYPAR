/**
 * Servicio para generar PDFs con múltiples etiquetas en formato A4.
 *
 * Específicamente diseñado para hojas MULTI3 con 33 etiquetas por página:
 * - Layout: 3 columnas × 11 filas
 * - Márgenes: 9mm superior e inferior, 0mm laterales
 * - Tamaño etiqueta: 70mm × 25.4mm
 *
 * @module @application/services/LabelPdfService
 * @requires jspdf
 * @requires @application/services/LabelPngService
 */

import type { Product } from '@domain/entities';
import type { LabelConfig } from './LabelPngService';
import { buildLabelSvg, mmToPx } from './LabelPngService';
import QRCode from 'qrcode';

// Constantes para el layout MULTI3
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const TOP_MARGIN_MM = 9;
const BOTTOM_MARGIN_MM = 9;
const LABEL_WIDTH_MM = 70;
const LABEL_HEIGHT_MM = 25.4;
const LABELS_PER_ROW = 3;
const LABELS_PER_COLUMN = 11;
const LABELS_PER_PAGE = LABELS_PER_ROW * LABELS_PER_COLUMN;

// Área útil después de márgenes
const USABLE_WIDTH_MM = A4_WIDTH_MM; // Sin márgenes laterales
const USABLE_HEIGHT_MM = A4_HEIGHT_MM - TOP_MARGIN_MM - BOTTOM_MARGIN_MM; // 279mm

/**
 * Convierte SVG a imagen base64 para usar en PDF.
 *
 * @param svg - String SVG a convertir
 * @returns Promise con el dataURL base64 de la imagen PNG
 */
async function svgToBase64(svg: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }
      // Fondo transparente para que coincida con el SVG sin fondo
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error cargando SVG'));
    };

    img.src = url;
  });
}

/**
 * Genera un PDF con múltiples etiquetas en formato A4 MULTI3.
 *
 * Cada página contiene exactamente 33 etiquetas (3 columnas × 11 filas).
 * Si hay más de 33 productos, se generan múltiples páginas automáticamente.
 *
 * @param products - Lista de productos para generar etiquetas
 * @param labelConfig - Configuración de las etiquetas (tamaño, fuentes, offsets, etc.)
 * @param buildQrPayload - Función para construir el payload del QR desde un producto
 * @returns Promise con el Blob del PDF generado
 * @throws Error si hay problemas generando el PDF
 */
export async function generateLabelsPdf(
  products: Product[],
  labelConfig: LabelConfig,
  buildQrPayload: (product: Product) => string,
): Promise<Blob> {
  if (products.length === 0) {
    throw new Error('No hay productos para generar etiquetas');
  }

  // Importación dinámica de jsPDF
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calcular posiciones de las etiquetas
  // Sin márgenes laterales, empezamos en x=0
  // Con margen superior de 9mm
  const startX = 0;
  const startY = TOP_MARGIN_MM;

  // Espaciado entre etiquetas (si hay espacio sobrante)
  const totalWidthNeeded = LABELS_PER_ROW * LABEL_WIDTH_MM;
  const totalHeightNeeded = LABELS_PER_COLUMN * LABEL_HEIGHT_MM;
  const spacingX =
    totalWidthNeeded < USABLE_WIDTH_MM
      ? (USABLE_WIDTH_MM - totalWidthNeeded) / (LABELS_PER_ROW + 1)
      : 0;
  const spacingY =
    totalHeightNeeded < USABLE_HEIGHT_MM
      ? (USABLE_HEIGHT_MM - totalHeightNeeded) / (LABELS_PER_COLUMN + 1)
      : 0;

  // currentPage se reserva para uso futuro si se necesita rastrear el número de página
  // let currentPage = 0;
  let labelIndex = 0;

  // Generar QR cache para evitar duplicados
  const qrCache = new Map<string, string>();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Nueva página cada 33 etiquetas
    if (labelIndex > 0 && labelIndex % LABELS_PER_PAGE === 0) {
      doc.addPage();
      // currentPage se incrementa aquí para uso futuro si se necesita rastrear el número de página
      // currentPage++;
    }

    // Calcular posición en la página actual
    const pageLabelIndex = labelIndex % LABELS_PER_PAGE;
    const row = Math.floor(pageLabelIndex / LABELS_PER_ROW);
    const col = pageLabelIndex % LABELS_PER_ROW;

    const x = startX + spacingX + col * (LABEL_WIDTH_MM + spacingX);
    const y = startY + spacingY + row * (LABEL_HEIGHT_MM + spacingY);

    // Generar QR si está habilitado
    let qrDataUrl: string | null = null;
    if (labelConfig.showQr) {
      const payload = buildQrPayload(product);
      if (qrCache.has(payload)) {
        qrDataUrl = qrCache.get(payload)!;
      } else {
        try {
          // Calcular tamaño del QR en píxeles para el PDF
          const qrSizePx = mmToPx(labelConfig.qrSizeMm, labelConfig.dpi);
          qrDataUrl = await QRCode.toDataURL(payload, {
            type: 'image/png',
            width: Math.max(512, qrSizePx * 2), // Asegurar buena calidad
            margin: 0, // Sin margen para que no haya marco
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          qrCache.set(payload, qrDataUrl);
        } catch (err) {
          console.error(`Error generando QR para producto ${product.code}:`, err);
        }
      }
    }

    // Generar SVG de la etiqueta
    const svg = buildLabelSvg(product, qrDataUrl, labelConfig);

    // Convertir SVG a imagen base64
    try {
      const base64 = await svgToBase64(svg);

      // Añadir imagen al PDF en la posición calculada
      doc.addImage(
        base64,
        'PNG',
        x,
        y,
        LABEL_WIDTH_MM,
        LABEL_HEIGHT_MM,
        undefined,
        'FAST', // Renderizado rápido
      );
    } catch (err) {
      console.error(`Error añadiendo etiqueta para producto ${product.code}:`, err);
    }

    labelIndex++;
  }

  // Generar blob del PDF
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Descarga un PDF de etiquetas generado.
 *
 * @param blob - Blob del PDF a descargar
 * @param filename - Nombre del archivo (por defecto: 'etiquetas.pdf')
 */
export function downloadLabelsPdf(blob: Blob, filename: string = 'etiquetas.pdf'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
