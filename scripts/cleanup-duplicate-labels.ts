/**
 * Script para limpiar etiquetas duplicadas y dejar solo la actual por producto
 * Similar a los QR, solo debe haber 1 etiqueta por producto (la más reciente)
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

const PRODUCT_LABEL_BUCKET = 'product-labels';

interface LabelAsset {
  id: string;
  product_id: string;
  label_path: string;
  created_at: string;
}

async function cleanupDuplicateLabels() {
  try {
    console.log('='.repeat(80));
    console.log('🧹 LIMPIEZA DE ETIQUETAS DUPLICADAS');
    console.log('='.repeat(80));
    console.log('');

    // 1. Obtener todas las etiquetas
    console.log('📊 PASO 1: Obteniendo todas las etiquetas de la base de datos...\n');

    const { data: allLabels, error: labelsError } = await supabase
      .from('product_label_assets')
      .select('id, product_id, label_path, created_at')
      .order('created_at', { ascending: false });

    if (labelsError) {
      throw new Error(`Error al obtener etiquetas: ${labelsError.message}`);
    }

    console.log(`   📦 Total de etiquetas en BD: ${allLabels?.length || 0}\n`);

    // 2. Agrupar por product_id y encontrar la más reciente
    console.log('🔍 PASO 2: Identificando etiquetas duplicadas...\n');

    const labelsByProduct = new Map<string, LabelAsset[]>();
    for (const label of allLabels || []) {
      const productId = label.product_id;
      if (!labelsByProduct.has(productId)) {
        labelsByProduct.set(productId, []);
      }
      labelsByProduct.get(productId)!.push(label);
    }

    const productsWithDuplicates: string[] = [];
    const labelsToKeep = new Set<string>();
    const labelsToDelete: LabelAsset[] = [];

    for (const [productId, labels] of labelsByProduct.entries()) {
      if (labels.length > 1) {
        productsWithDuplicates.push(productId);
        // Ordenar por created_at descendente (más reciente primero)
        labels.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        // Mantener solo la más reciente
        labelsToKeep.add(labels[0].id);
        // Marcar las demás para eliminar
        for (let i = 1; i < labels.length; i++) {
          labelsToDelete.push(labels[i]);
        }
      } else {
        // Solo hay 1 etiqueta, mantenerla
        labelsToKeep.add(labels[0].id);
      }
    }

    console.log(`   📊 Productos con etiquetas: ${labelsByProduct.size}`);
    console.log(
      `   ⚠️  Productos con etiquetas duplicadas: ${productsWithDuplicates.length}`,
    );
    console.log(`   🗑️  Etiquetas a eliminar: ${labelsToDelete.length}\n`);

    if (labelsToDelete.length === 0) {
      console.log('✨ No hay etiquetas duplicadas. Todo está correcto.\n');
      return;
    }

    // 3. Eliminar etiquetas antiguas de la BD
    console.log('🗑️  PASO 3: Eliminando etiquetas antiguas de la base de datos...\n');

    const idsToDelete = labelsToDelete.map((l) => l.id);
    const pathsToDelete = labelsToDelete.map((l) => l.label_path);

    // Eliminar en lotes de 100
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('product_label_assets')
        .delete()
        .in('id', batch);

      if (deleteError) {
        throw new Error(`Error al eliminar etiquetas de BD: ${deleteError.message}`);
      }

      deletedCount += batch.length;
      console.log(
        `   ✅ Eliminadas ${deletedCount}/${idsToDelete.length} etiquetas de BD`,
      );
    }

    console.log('');

    // 4. Eliminar archivos antiguos de Storage
    console.log('🗑️  PASO 4: Eliminando archivos antiguos de Storage...\n');

    // Verificar qué archivos existen antes de eliminar
    const existingPaths = new Set<string>();
    for (const path of pathsToDelete) {
      const { data, error } = await supabase.storage
        .from(PRODUCT_LABEL_BUCKET)
        .list(path.split('/').slice(0, -1).join('/'));

      if (!error && data) {
        const fileName = path.split('/').pop();
        const exists = data.some((item) => item.name === fileName);
        if (exists) {
          existingPaths.add(path);
        }
      }
    }

    console.log(`   📦 Archivos a eliminar de Storage: ${existingPaths.size}\n`);

    // Eliminar archivos en lotes
    const pathsArray = Array.from(existingPaths);
    let deletedFilesCount = 0;

    for (let i = 0; i < pathsArray.length; i += batchSize) {
      const batch = pathsArray.slice(i, i + batchSize);
      const { error: storageError } = await supabase.storage
        .from(PRODUCT_LABEL_BUCKET)
        .remove(batch);

      if (storageError) {
        console.warn(
          `   ⚠️  Error al eliminar algunos archivos de Storage: ${storageError.message}`,
        );
      } else {
        deletedFilesCount += batch.length;
        console.log(
          `   ✅ Eliminados ${deletedFilesCount}/${pathsArray.length} archivos de Storage`,
        );
      }
    }

    console.log('');

    // 5. Verificación final
    console.log('🔍 PASO 5: Verificación final...\n');

    const { data: finalLabels, error: finalError } = await supabase
      .from('product_label_assets')
      .select('product_id')
      .order('created_at', { ascending: false });

    if (finalError) {
      throw new Error(`Error al verificar etiquetas finales: ${finalError.message}`);
    }

    const finalLabelsByProduct = new Map<string, number>();
    for (const label of finalLabels || []) {
      const count = finalLabelsByProduct.get(label.product_id) || 0;
      finalLabelsByProduct.set(label.product_id, count + 1);
    }

    const productsWithMultipleLabels = Array.from(finalLabelsByProduct.entries()).filter(
      ([, count]) => count > 1,
    );

    console.log(`   ✅ Etiquetas finales en BD: ${finalLabels?.length || 0}`);
    console.log(`   ✅ Productos con etiquetas: ${finalLabelsByProduct.size}`);

    if (productsWithMultipleLabels.length > 0) {
      console.log(
        `   ⚠️  Productos que aún tienen múltiples etiquetas: ${productsWithMultipleLabels.length}`,
      );
      console.log(
        '   (Esto puede ser normal si hay etiquetas con diferentes configuraciones)',
      );
    } else {
      console.log(`   ✅ Todos los productos tienen exactamente 1 etiqueta`);
    }

    console.log('');

    // 6. Resumen final
    console.log('='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`📦 Etiquetas iniciales: ${allLabels?.length || 0}`);
    console.log(`🗑️  Etiquetas eliminadas de BD: ${deletedCount}`);
    console.log(`🗑️  Archivos eliminados de Storage: ${deletedFilesCount}`);
    console.log(`✅ Etiquetas finales en BD: ${finalLabels?.length || 0}`);
    console.log(`✅ Productos con etiquetas: ${finalLabelsByProduct.size}`);
    console.log('='.repeat(80));

    if (productsWithMultipleLabels.length === 0) {
      console.log('\n✨ ¡Perfecto! Cada producto tiene exactamente 1 etiqueta.\n');
    } else {
      console.log(
        `\n⚠️  Nota: ${productsWithMultipleLabels.length} productos aún tienen múltiples etiquetas.\n`,
      );
      console.log(
        '   Esto puede ser normal si hay etiquetas con diferentes configuraciones.',
      );
      console.log(
        '   Si quieres mantener solo la más reciente, ejecuta este script nuevamente.\n',
      );
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

cleanupDuplicateLabels();
