/**
 * Script para verificar que los archivos QR y etiquetas estén en Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function listStorageFiles(bucket: string, folder?: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder || '', {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    throw new Error(`Error al listar archivos en ${bucket}: ${error.message}`);
  }

  const files: string[] = [];
  for (const item of data || []) {
    if (item.id) {
      // Es un archivo
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      files.push(fullPath);
    } else if (item.name) {
      // Es una carpeta, listar recursivamente
      const folderPath = folder ? `${folder}/${item.name}` : item.name;
      const subFiles = await listStorageFiles(bucket, folderPath);
      files.push(...subFiles);
    }
  }

  return files;
}

async function verifyStorageFiles() {
  try {
    console.log('='.repeat(80));
    console.log('🔍 VERIFICACIÓN DE ARCHIVOS EN SUPABASE STORAGE');
    console.log('='.repeat(80));
    console.log('');

    // 1. Verificar registros en BD
    console.log('📊 PASO 1: Verificando registros en la base de datos...\n');

    const { data: qrAssets, error: qrError } = await supabase
      .from('product_qr_assets')
      .select('product_id, qr_path');

    if (qrError) {
      throw new Error(`Error al obtener QR assets: ${qrError.message}`);
    }

    const { data: labelAssets, error: labelError } = await supabase
      .from('product_label_assets')
      .select('product_id, label_path');

    if (labelError) {
      throw new Error(`Error al obtener label assets: ${labelError.message}`);
    }

    console.log(`   ✅ Registros QR en BD: ${qrAssets?.length || 0}`);
    console.log(`   ✅ Registros Etiquetas en BD: ${labelAssets?.length || 0}\n`);

    // 2. Listar archivos en Storage
    console.log('📦 PASO 2: Listando archivos en Supabase Storage...\n');

    console.log(`   🔍 Listando archivos en bucket '${PRODUCT_QR_BUCKET}'...`);
    const qrFiles = await listStorageFiles(PRODUCT_QR_BUCKET);
    console.log(`   ✅ Archivos QR encontrados en Storage: ${qrFiles.length}\n`);

    console.log(`   🔍 Listando archivos en bucket '${PRODUCT_LABEL_BUCKET}'...`);
    const labelFiles = await listStorageFiles(PRODUCT_LABEL_BUCKET);
    console.log(
      `   ✅ Archivos Etiquetas encontrados en Storage: ${labelFiles.length}\n`,
    );

    // 3. Verificar que los archivos de BD existan en Storage
    console.log('🔍 PASO 3: Verificando que los archivos de BD existan en Storage...\n');

    const qrPathsInDb = new Set((qrAssets || []).map((a) => a.qr_path));
    const labelPathsInDb = new Set((labelAssets || []).map((a) => a.label_path));

    const qrFilesSet = new Set(qrFiles);
    const labelFilesSet = new Set(labelFiles);

    let qrMissing = 0;
    let labelMissing = 0;

    for (const qrPath of qrPathsInDb) {
      if (!qrFilesSet.has(qrPath)) {
        qrMissing++;
        if (qrMissing <= 5) {
          console.log(`   ⚠️  QR faltante en Storage: ${qrPath}`);
        }
      }
    }

    for (const labelPath of labelPathsInDb) {
      if (!labelFilesSet.has(labelPath)) {
        labelMissing++;
        if (labelMissing <= 5) {
          console.log(`   ⚠️  Etiqueta faltante en Storage: ${labelPath}`);
        }
      }
    }

    console.log('');

    // 4. Resumen final
    console.log('='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`✅ Registros QR en BD: ${qrAssets?.length || 0}`);
    console.log(`✅ Archivos QR en Storage: ${qrFiles.length}`);
    console.log(
      `   ${qrMissing === 0 ? '✅' : '⚠️'} QR faltantes en Storage: ${qrMissing}`,
    );
    console.log('');
    console.log(`✅ Registros Etiquetas en BD: ${labelAssets?.length || 0}`);
    console.log(`✅ Archivos Etiquetas en Storage: ${labelFiles.length}`);
    console.log(
      `   ${labelMissing === 0 ? '✅' : '⚠️'} Etiquetas faltantes en Storage: ${labelMissing}`,
    );
    console.log('='.repeat(80));

    if (qrMissing === 0 && labelMissing === 0) {
      console.log('\n✨ ¡Perfecto! Todos los archivos están en Supabase Storage.\n');
    } else {
      console.log('\n⚠️  Hay algunos archivos faltantes en Storage.\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

verifyStorageFiles();
