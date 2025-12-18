/**
 * Script para generar QR y etiquetas faltantes para todos los productos
 *
 * Uso:
 *   ts-node --project tsconfig.node.json scripts/generate-missing-qr-labels.ts
 *
 * El script:
 * - Obtiene todos los productos activos
 * - Verifica cuáles no tienen QR (product_qr_assets)
 * - Verifica cuáles no tienen etiqueta (product_label_assets)
 * - Genera los QR faltantes
 * - Genera las etiquetas faltantes con configuración por defecto
 * - Sube a Supabase Storage y guarda en BD
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.resolve();

// Cargar variables de entorno
const loadEnv = () => {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts
            .join('=')
            .trim()
            .replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  }
};

loadEnv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PRODUCT_QR_BUCKET = 'product-qrs';
const PRODUCT_LABEL_BUCKET = 'product-labels';

interface Product {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  aisle: string;
  shelf: string;
  warehouse: string | null;
}

interface GenerationResult {
  qrGenerated: number;
  qrSkipped: number;
  labelGenerated: number;
  labelSkipped: number;
  errors: Array<{
    productCode: string;
    productName: string;
    type: 'qr' | 'label';
    error: string;
  }>;
}

// Configuración por defecto de etiqueta (igual que en LabelsQrPage)
const defaultLabelConfig = {
  widthMm: 35,
  heightMm: 15,
  dpi: 203,
  showQr: true,
  showCode: true,
  showBarcode: false,
  showName: true,
  showWarehouse: false,
  showLocation: false,
  qrSizeMm: 13,
  paddingMm: 0.7,
  codeFontPx: 13,
  barcodeFontPx: 11,
  locationFontPx: 10,
  warehouseFontPx: 10,
  nameFontPx: 10,
  nameMaxLines: 2,
  barcodeBold: false,
  locationBold: false,
  warehouseBold: false,
  nameBold: false,
  offsetsMm: {
    qr: { x: 0, y: 0 },
    code: { x: -0.5, y: 2 },
    barcode: { x: 0, y: 0 },
    location: { x: 0, y: 0 },
    warehouse: { x: 0, y: 0 },
    name: { x: -0.5, y: -4 },
  },
};

function truncateWithEllipsis(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, Math.max(0, maxChars - 1)).trimEnd();
  return `${cut}…`;
}

function buildQrPayload(product: Product): string {
  const code = String(product.code ?? '').trim();
  const name = String(product.name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replaceAll('|', ' ');

  return `${code}|${truncateWithEllipsis(name, 60)}`;
}

function sanitizeStorageFileName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'barcode';
  const normalized = trimmed.normalize('NFKD');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const collapsed = safe.replace(/_+/g, '_').replace(/^[_.]+|[_.]+$/g, '');
  const limited = collapsed.slice(0, 120);
  return limited || 'barcode';
}

function buildProductQrPath(productId: string, barcode: string): string {
  const safeBarcode = sanitizeStorageFileName(barcode);
  return `${productId}/${safeBarcode}.png`;
}

function buildProductLabelPath(productId: string, configHash: string): string {
  const safeHash = sanitizeStorageFileName(configHash);
  return `${productId}/labels/${safeHash}.png`;
}

function hashStringToBase36(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function estimateTextPxWidth(text: string, fontPx: number, isBold: boolean): number {
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

  if (lines.length > 0) {
    const limited = lines.slice(0, Math.max(1, maxLines));
    return limited;
  }

  return [];
}

function buildLabelSvg(
  product: Product,
  qrDataUrl: string | null,
  cfg: typeof defaultLabelConfig,
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
      const weight = cfg.nameBold ? 700 : 600;
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

async function svgToPngBlob(svg: string, widthPx: number): Promise<Blob> {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: widthPx,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  // Forzar a Uint8Array "plain" para evitar incompatibilidades TS (SharedArrayBuffer vs ArrayBuffer)
  const pngBytes = Uint8Array.from(pngBuffer);
  return new Blob([pngBytes], { type: 'image/png' });
}

async function generateQrPngBlob(text: string, sizePx: number = 1024): Promise<Blob> {
  const value = text.trim();
  if (!value) {
    throw new Error('No se puede generar un QR vacío.');
  }

  const dataUrl = await QRCode.toDataURL(value, {
    type: 'image/png',
    width: sizePx,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const res = await fetch(dataUrl);
  return await res.blob();
}

async function uploadProductQr(
  productId: string,
  barcode: string,
  pngBlob: Blob,
): Promise<string> {
  const filePath = buildProductQrPath(productId, barcode);

  const { error } = await supabase.storage
    .from(PRODUCT_QR_BUCKET)
    .upload(filePath, pngBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Error al subir QR a Storage: ${error.message}`);
  }

  return filePath;
}

async function uploadProductLabel(
  productId: string,
  configHash: string,
  pngBlob: Blob,
): Promise<string> {
  const filePath = buildProductLabelPath(productId, configHash);

  const { error } = await supabase.storage
    .from(PRODUCT_LABEL_BUCKET)
    .upload(filePath, pngBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    throw new Error(`Error al subir etiqueta a Storage: ${error.message}`);
  }

  return filePath;
}

async function upsertQrAsset(
  productId: string,
  barcode: string,
  qrPath: string,
): Promise<void> {
  const { error } = await supabase.from('product_qr_assets').upsert(
    {
      product_id: productId,
      barcode: barcode,
      qr_path: qrPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'product_id' },
  );

  if (error) {
    throw new Error(`Error al guardar QR en BD: ${error.message}`);
  }
}

async function upsertLabelAsset(
  productId: string,
  labelPath: string,
  configHash: string,
  configJson: Record<string, unknown>,
): Promise<void> {
  // Verificar si ya existe una etiqueta para este producto
  const { data: existing } = await supabase
    .from('product_label_assets')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    // Actualizar la existente
    const { error } = await supabase
      .from('product_label_assets')
      .update({
        label_path: labelPath,
        config_hash: configHash,
        config_json: configJson,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Error al actualizar etiqueta en BD: ${error.message}`);
    }
  } else {
    // Insertar nueva
    const { error } = await supabase.from('product_label_assets').insert({
      product_id: productId,
      label_path: labelPath,
      config_hash: configHash,
      config_json: configJson,
    });

    if (error) {
      throw new Error(`Error al guardar etiqueta en BD: ${error.message}`);
    }
  }
}

async function processProduct(product: Product, result: GenerationResult): Promise<void> {
  try {
    // Verificar QR
    const { data: existingQr } = await supabase
      .from('product_qr_assets')
      .select('qr_path')
      .eq('product_id', product.id)
      .maybeSingle();

    let qrDataUrl: string | null = null;

    if (!existingQr) {
      // Generar QR
      const qrContent = buildQrPayload(product);
      const pngBlob = await generateQrPngBlob(qrContent, 1024);
      const qrPath = await uploadProductQr(product.id, qrContent, pngBlob);
      await upsertQrAsset(product.id, qrContent, qrPath);

      // Convertir blob a data URL para la etiqueta
      const arrayBuffer = await pngBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

      result.qrGenerated++;
      console.log(`   ✅ QR generado`);
    } else {
      result.qrSkipped++;
      // Obtener QR existente para usarlo en la etiqueta
      const { data: signedUrl } = await supabase.storage
        .from(PRODUCT_QR_BUCKET)
        .createSignedUrl(existingQr.qr_path, 60);
      if (signedUrl) {
        const res = await fetch(signedUrl.signedUrl);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
      }
    }

    // Verificar etiqueta
    const { data: existingLabel } = await supabase
      .from('product_label_assets')
      .select('label_path')
      .eq('product_id', product.id)
      .maybeSingle();

    if (!existingLabel) {
      // Generar etiqueta
      const configJson = defaultLabelConfig as unknown as Record<string, unknown>;
      const configHash = hashStringToBase36(stableStringify(configJson));
      const svg = buildLabelSvg(product, qrDataUrl, defaultLabelConfig);

      const widthPx = mmToPx(defaultLabelConfig.widthMm, defaultLabelConfig.dpi);
      const pngBlob = await svgToPngBlob(svg, widthPx);

      const labelPath = await uploadProductLabel(product.id, configHash, pngBlob);
      await upsertLabelAsset(product.id, labelPath, configHash, configJson);

      result.labelGenerated++;
      console.log(`   ✅ Etiqueta generada`);
    } else {
      result.labelSkipped++;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    result.errors.push({
      productCode: product.code,
      productName: product.name,
      type: 'qr',
      error: errorMessage,
    });
    console.error(`   ❌ Error: ${errorMessage}`);
  }
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('📦 GENERACIÓN DE QR Y ETIQUETAS FALTANTES');
    console.log('='.repeat(80));
    console.log('');

    console.log('🔍 Obteniendo productos activos...\n');

    // Obtener todos los productos activos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, code, name, barcode, aisle, shelf, warehouse')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (productsError) {
      throw new Error(`Error al obtener productos: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('⚠️  No se encontraron productos activos.');
      return;
    }

    console.log(`📦 Se encontraron ${products.length} productos activos.\n`);

    // Verificar cuántos tienen QR y etiquetas
    const { data: qrAssets } = await supabase
      .from('product_qr_assets')
      .select('product_id');

    const { data: labelAssets } = await supabase
      .from('product_label_assets')
      .select('product_id');

    const qrProductIds = new Set((qrAssets || []).map((a) => a.product_id));
    const labelProductIds = new Set((labelAssets || []).map((a) => a.product_id));

    const productsWithoutQr = products.filter((p) => !qrProductIds.has(p.id));
    const productsWithoutLabel = products.filter((p) => !labelProductIds.has(p.id));

    console.log(`📊 Productos sin QR: ${productsWithoutQr.length}`);
    console.log(`📊 Productos sin etiqueta: ${productsWithoutLabel.length}\n`);

    const result: GenerationResult = {
      qrGenerated: 0,
      qrSkipped: 0,
      labelGenerated: 0,
      labelSkipped: 0,
      errors: [],
    };

    console.log('🚀 Iniciando generación...\n');

    // Procesar en lotes
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchPromises = batch.map((product) => {
        console.log(
          `[${i + batch.indexOf(product) + 1}/${products.length}] ${product.code} - ${product.name}`,
        );
        return processProduct(product, result);
      });
      await Promise.all(batchPromises);

      const processed = Math.min(i + batchSize, products.length);
      const percentage = ((processed / products.length) * 100).toFixed(1);
      console.log(`\n📊 Progreso: ${processed}/${products.length} (${percentage}%)\n`);
    }

    // Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`✅ QR generados: ${result.qrGenerated}`);
    console.log(`⏭️  QR que ya existían: ${result.qrSkipped}`);
    console.log(`✅ Etiquetas generadas: ${result.labelGenerated}`);
    console.log(`⏭️  Etiquetas que ya existían: ${result.labelSkipped}`);
    console.log(`❌ Errores: ${result.errors.length}`);
    console.log('='.repeat(80));

    if (result.errors.length > 0) {
      console.log('\n❌ PRODUCTOS CON ERRORES:');
      result.errors.forEach((err, idx) => {
        console.log(
          `  ${idx + 1}. ${err.productCode} - ${err.productName} (${err.type}): ${err.error}`,
        );
      });
    }

    console.log('\n✨ Proceso completado.\n');
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
