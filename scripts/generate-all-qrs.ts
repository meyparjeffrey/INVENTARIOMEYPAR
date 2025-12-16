/**
 * Script para generar QR codes automáticamente para todos los productos.
 *
 * Uso:
 *   ts-node --project tsconfig.node.json scripts/generate-all-qrs.ts
 *
 * El script:
 * - Obtiene todos los productos de la base de datos
 * - Genera un QR para cada producto (CODE|NAME_TRUNC)
 * - Sube los QR a Supabase Storage (bucket: product-qrs)
 * - Guarda los registros en la tabla product_qr_assets
 * - Muestra progreso y resumen final
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';

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
  console.error('   Buscando: SUPABASE_URL, VITE_SUPABASE_URL');
  console.error(
    '   Buscando: SUPABASE_SERVICE_KEY, VITE_SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PRODUCT_QR_BUCKET = 'product-qrs';

interface Product {
  id: string;
  code: string;
  name: string;
}

interface GenerationResult {
  success: number;
  skipped: number;
  errors: Array<{ productCode: string; productName: string; error: string }>;
}

/**
 * Trunca texto con ellipsis si excede el máximo de caracteres.
 */
function truncateWithEllipsis(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, Math.max(0, maxChars - 1)).trimEnd();
  return `${cut}…`;
}

/**
 * Genera el payload del QR: CODE|NAME_TRUNC
 */
function buildQrPayload(product: Product): string {
  const code = String(product.code ?? '').trim();
  const name = String(product.name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replaceAll('|', ' ');

  // QR compacto para etiquetas pequeñas: CODE|NAME_TRUNC
  return `${code}|${truncateWithEllipsis(name, 60)}`;
}

/**
 * Sanea el nombre del archivo para Storage.
 */
function sanitizeStorageFileName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'barcode';

  const normalized = trimmed.normalize('NFKD');
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const collapsed = safe.replace(/_+/g, '_').replace(/^[_.]+|[_.]+$/g, '');
  const limited = collapsed.slice(0, 120);
  return limited || 'barcode';
}

/**
 * Construye la ruta del QR en Storage.
 */
function buildProductQrPath(productId: string, barcode: string): string {
  const safeBarcode = sanitizeStorageFileName(barcode);
  return `${productId}/${safeBarcode}.png`;
}

/**
 * Genera el PNG blob del QR.
 */
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

/**
 * Sube el QR a Supabase Storage.
 */
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

/**
 * Guarda o actualiza el registro del QR en la base de datos.
 */
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

/**
 * Procesa un producto: genera QR, sube a Storage y guarda en BD.
 */
async function processProduct(product: Product, result: GenerationResult): Promise<void> {
  try {
    // Verificar si ya existe un QR para este producto
    const { data: existing } = await supabase
      .from('product_qr_assets')
      .select('qr_path')
      .eq('product_id', product.id)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      console.log(
        `⏭️  [${result.success + result.skipped}] ${product.code} - ${product.name} (ya existe)`,
      );
      return;
    }

    // Generar payload del QR
    const qrContent = buildQrPayload(product);

    // Generar PNG blob
    const pngBlob = await generateQrPngBlob(qrContent, 1024);

    // Subir a Storage
    const qrPath = await uploadProductQr(product.id, qrContent, pngBlob);

    // Guardar en BD
    await upsertQrAsset(product.id, qrContent, qrPath);

    result.success++;
    console.log(
      `✅ [${result.success + result.skipped}] ${product.code} - ${product.name}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    result.errors.push({
      productCode: product.code,
      productName: product.name,
      error: errorMessage,
    });
    console.error(`❌ [ERROR] ${product.code} - ${product.name}: ${errorMessage}`);
  }
}

/**
 * Procesa productos en lotes con concurrencia limitada.
 */
async function processProductsInBatches(
  products: Product[],
  batchSize: number = 10,
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`\n🚀 Iniciando generación de QR para ${products.length} productos...\n`);

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchPromises = batch.map((product) => processProduct(product, result));
    await Promise.all(batchPromises);

    // Mostrar progreso cada lote
    const processed = Math.min(i + batchSize, products.length);
    const percentage = ((processed / products.length) * 100).toFixed(1);
    console.log(`\n📊 Progreso: ${processed}/${products.length} (${percentage}%)\n`);
  }

  return result;
}

/**
 * Función principal.
 */
async function main() {
  try {
    console.log('🔍 Obteniendo todos los productos...\n');

    // Obtener todos los productos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, code, name')
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

    // Procesar productos en lotes
    const result = await processProductsInBatches(products, 10);

    // Mostrar resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`✅ QR generados exitosamente: ${result.success}`);
    console.log(`⏭️  QR que ya existían (skipped): ${result.skipped}`);
    console.log(`❌ Errores: ${result.errors.length}`);
    console.log(
      `📦 Total procesado: ${result.success + result.skipped + result.errors.length}`,
    );
    console.log('='.repeat(60));

    if (result.errors.length > 0) {
      console.log('\n❌ PRODUCTOS CON ERRORES:');
      result.errors.forEach((err, idx) => {
        console.log(
          `  ${idx + 1}. ${err.productCode} - ${err.productName}: ${err.error}`,
        );
      });
    }

    // Verificar en la base de datos
    console.log('\n🔍 Verificando en la base de datos...');
    const { count } = await supabase
      .from('product_qr_assets')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total de QR en BD: ${count}`);
    console.log(`📊 Total de productos: ${products.length}`);

    if (count === products.length) {
      console.log('✅ ¡Perfecto! Todos los productos tienen QR.');
    } else if (count && count > 0) {
      console.log(
        `⚠️  Hay ${products.length - count} productos sin QR (puede ser normal si hubo errores).`,
      );
    }

    console.log('\n✨ Proceso completado.\n');
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
