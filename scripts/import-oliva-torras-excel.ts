/**
 * Script para importar productos del Excel de OLIVA TORRAS
 * - Si el producto existe: añade/actualiza ubicación OLIVA_TORRAS
 * - Si no existe: crea producto nuevo con ubicación OLIVA_TORRAS
 */

import XLSX from 'xlsx';
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

type ExcelRow = Record<string, unknown>;

interface ProductFromExcel {
  code: string;
  name: string;
  quantity: number;
  rowNumber: number;
}

interface ImportResult {
  updated: number;
  created: number;
  errors: Array<{ code: string; reason: string; row: number }>;
}

/**
 * Lee el archivo Excel y extrae los productos
 */
function readExcelFile(filePath: string): {
  products: ProductFromExcel[];
  errors: Array<{ code: string; reason: string; row: number }>;
} {
  console.log(`📖 Leyendo archivo: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`📄 Hoja encontrada: ${sheetName}\n`);

  const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: '' });

  console.log(`📊 Total de filas en Excel: ${data.length}\n`);

  if (data.length === 0) {
    return { products: [], errors: [] };
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  const findColumn = (possibleNames: string[]): string | null => {
    for (const name of possibleNames) {
      const found = columns.find(
        (col) => col.toUpperCase().trim() === name.toUpperCase().trim(),
      );
      if (found) return found;
    }
    return null;
  };

  const codeColumn = findColumn(['CODIGO', 'CÓDIGO', 'CODE', 'CODI', 'CÓDI', 'COD']);
  const nameColumn = findColumn([
    'NOMBRE',
    'DESCRIPCION',
    'DESCRIPCIÓN',
    'DESCRIPTION',
    'PRODUCTO',
  ]);
  const quantityColumn = findColumn([
    'CANTIDAD',
    'STOCK',
    'STOCK ACTUAL',
    'STOCK_ACTUAL',
    'UNITATS',
    'UNIDADES',
    'QTY',
    'QUANTITY',
    'ESTOC',
    'ESTOCK',
  ]);

  if (!codeColumn || !nameColumn) {
    throw new Error(
      `No se encontraron las columnas necesarias. Código: ${codeColumn || 'NO'}, Nombre: ${nameColumn || 'NO'}`,
    );
  }

  const products: ProductFromExcel[] = [];
  const errors: Array<{ code: string; reason: string; row: number }> = [];
  const codeSet = new Set<string>();

  data.forEach((row, index) => {
    const rowNumber = index + 2;

    const code = String(row[codeColumn] || '').trim();
    const name = String(row[nameColumn] || '').trim();
    const quantityRaw = quantityColumn ? row[quantityColumn] : null;

    let quantity = 0;
    if (quantityRaw !== null && quantityRaw !== undefined && quantityRaw !== '') {
      const qtyNum = Number(quantityRaw);
      if (!isNaN(qtyNum) && qtyNum >= 0) {
        quantity = Math.floor(qtyNum);
      }
    }

    if (!code) {
      errors.push({ code: '', reason: 'Código vacío', row: rowNumber });
      return;
    }

    if (!name) {
      errors.push({ code, reason: 'Nombre vacío', row: rowNumber });
      return;
    }

    if (codeSet.has(code)) {
      errors.push({ code, reason: 'Código duplicado en el Excel', row: rowNumber });
      return;
    }

    codeSet.add(code);
    products.push({ code, name, quantity, rowNumber });
  });

  console.log(`✅ Productos válidos extraídos: ${products.length}`);
  console.log(`⚠️  Errores de validación: ${errors.length}\n`);

  return { products, errors };
}

/**
 * Obtiene el ID del primer usuario ADMIN
 */
async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'ADMIN')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `No se encontró un usuario ADMIN. Error: ${error?.message || 'Sin datos'}`,
    );
  }

  return data.id;
}

/**
 * Procesa productos existentes: añade/actualiza ubicación OLIVA_TORRAS
 */
async function processExistingProduct(
  productId: string,
  quantity: number,
  adminUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener ubicaciones existentes del producto
    const { data: locations, error: fetchError } = await supabase
      .from('product_locations')
      .select('*')
      .eq('product_id', productId);

    if (fetchError) {
      return {
        success: false,
        error: `Error al obtener ubicaciones: ${fetchError.message}`,
      };
    }

    // Buscar si ya existe ubicación OLIVA_TORRAS
    const olivaLocation = locations?.find((loc) => loc.warehouse === 'OLIVA_TORRAS');

    if (olivaLocation) {
      // Actualizar cantidad existente sumando la nueva
      const newQuantity = (olivaLocation.quantity || 0) + quantity;
      const { error: updateError } = await supabase
        .from('product_locations')
        .update({
          quantity: Math.max(0, newQuantity),
          updated_by: adminUserId,
        })
        .eq('id', olivaLocation.id);

      if (updateError) {
        return { success: false, error: `Error al actualizar: ${updateError.message}` };
      }

      console.log(
        `   ✅ Actualizada ubicación OLIVA_TORRAS: ${olivaLocation.quantity || 0} + ${quantity} = ${newQuantity}`,
      );
    } else {
      // Crear nueva ubicación OLIVA_TORRAS
      const { error: insertError } = await supabase.from('product_locations').insert({
        product_id: productId,
        warehouse: 'OLIVA_TORRAS',
        aisle: '1', // aisle por defecto
        shelf: 'A', // shelf por defecto
        quantity: Math.max(0, quantity),
        is_primary: false, // no es primaria
        created_by: adminUserId,
      });

      if (insertError) {
        return {
          success: false,
          error: `Error al crear ubicación: ${insertError.message}`,
        };
      }

      console.log(`   ✅ Creada nueva ubicación OLIVA_TORRAS con cantidad: ${quantity}`);
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Crea un producto nuevo con ubicación OLIVA_TORRAS
 */
async function createNewProduct(
  code: string,
  name: string,
  quantity: number,
  adminUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Crear producto nuevo
    const { data: newProduct, error: createError } = await supabase
      .from('products')
      .insert({
        code,
        name,
        description: null,
        category: null,
        stock_current: 0, // Se actualizará automáticamente con el trigger
        stock_min: 10, // Valor por defecto
        stock_max: null,
        aisle: '1',
        shelf: 'A',
        location_extra: null,
        warehouse: 'OLIVA_TORRAS',
        cost_price: 0,
        sale_price: null,
        purchase_url: null,
        image_url: null,
        supplier_code: null,
        is_active: true,
        is_batch_tracked: false,
        unit_of_measure: 'unidad',
        weight_kg: null,
        dimensions_cm: null,
        notes: null,
        created_by: adminUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createError || !newProduct) {
      return {
        success: false,
        error: `Error al crear producto: ${createError?.message || 'Sin datos'}`,
      };
    }

    // Crear ubicación OLIVA_TORRAS
    const { error: locationError } = await supabase.from('product_locations').insert({
      product_id: newProduct.id,
      warehouse: 'OLIVA_TORRAS',
      aisle: '1', // aisle por defecto
      shelf: 'A', // shelf por defecto
      quantity: Math.max(0, quantity),
      is_primary: true, // es la ubicación primaria para productos nuevos
      created_by: adminUserId,
    });

    if (locationError) {
      return {
        success: false,
        error: `Error al crear ubicación: ${locationError.message}`,
      };
    }

    console.log(
      `   ✅ Creado producto nuevo con ubicación OLIVA_TORRAS (cantidad: ${quantity})`,
    );

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Función principal de importación
 */
async function main() {
  const excelPath = path.join(__dirname, 'Docs', 'davidbd.xlsx');

  console.log('='.repeat(80));
  console.log('📦 IMPORTACIÓN DE PRODUCTOS OLIVA TORRAS');
  console.log('='.repeat(80));
  console.log('');

  const startTime = Date.now();
  const result: ImportResult = {
    updated: 0,
    created: 0,
    errors: [],
  };

  try {
    // 1. Leer Excel
    console.log('📖 PASO 1: Leyendo archivo Excel');
    console.log('-'.repeat(80));
    const { products, errors: excelErrors } = readExcelFile(excelPath);

    if (products.length === 0) {
      console.error('❌ No se encontraron productos válidos en el Excel');
      process.exit(1);
    }

    result.errors.push(...excelErrors);

    // 2. Obtener usuario admin
    console.log('\n👤 PASO 2: Obteniendo usuario ADMIN');
    console.log('-'.repeat(80));
    const adminUserId = await getAdminUserId();
    console.log(`✅ Usuario ADMIN: ${adminUserId}\n`);

    // 3. Obtener productos existentes
    console.log('🔍 PASO 3: Consultando productos existentes');
    console.log('-'.repeat(80));
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, code')
      .eq('is_active', true);

    const existingProductsMap = new Map<string, string>();
    if (existingProducts) {
      existingProducts.forEach((p) => {
        existingProductsMap.set(p.code, p.id);
      });
    }
    console.log(`✅ Productos existentes encontrados: ${existingProductsMap.size}\n`);

    // 4. Procesar productos
    console.log('📦 PASO 4: Procesando productos');
    console.log('-'.repeat(80));
    console.log('');

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;

      console.log(`${progress} ${product.code} - ${product.name}`);

      const existingProductId = existingProductsMap.get(product.code);

      if (existingProductId) {
        // Producto existe: actualizar ubicación
        const processResult = await processExistingProduct(
          existingProductId,
          product.quantity,
          adminUserId,
        );

        if (processResult.success) {
          result.updated++;
        } else {
          result.errors.push({
            code: product.code,
            reason: `Error al actualizar: ${processResult.error}`,
            row: product.rowNumber,
          });
          console.log(`   ❌ Error: ${processResult.error}`);
        }
      } else {
        // Producto nuevo: crear
        const createResult = await createNewProduct(
          product.code,
          product.name,
          product.quantity,
          adminUserId,
        );

        if (createResult.success) {
          result.created++;
        } else {
          result.errors.push({
            code: product.code,
            reason: `Error al crear: ${createResult.error}`,
            row: product.rowNumber,
          });
          console.log(`   ❌ Error: ${createResult.error}`);
        }
      }

      // Pequeña pausa para no sobrecargar la base de datos
      if (i < products.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // 5. Resumen final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log('');
    console.log(
      `✅ Productos actualizados (stock añadido a OLIVA_TORRAS): ${result.updated}`,
    );
    console.log(`🆕 Productos nuevos creados: ${result.created}`);
    console.log(`❌ Errores: ${result.errors.length}`);
    console.log(`⏱️  Tiempo total: ${duration} segundos`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('⚠️  ERRORES DETALLADOS:');
      result.errors.slice(0, 20).forEach((error, index) => {
        console.log(
          `   ${index + 1}. Fila ${error.row} (${error.code}): ${error.reason}`,
        );
      });
      if (result.errors.length > 20) {
        console.log(`   ... y ${result.errors.length - 20} errores más`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('');
    console.log('💡 El stock_total de cada producto se ha actualizado automáticamente');
    console.log('   gracias a los triggers de Supabase.');
    console.log('');
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR DURANTE LA IMPORTACIÓN');
    console.error('='.repeat(80));
    console.error(error);
    process.exit(1);
  }
}

main();
