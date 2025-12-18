/**
 * Script para analizar el Excel de OLIVA TORRAS y comparar con productos existentes
 * NO MODIFICA LA BASE DE DATOS, solo analiza
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
  console.error('   Buscando: SUPABASE_URL, VITE_SUPABASE_URL');
  console.error(
    '   Buscando: SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_SERVICE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type ExcelRow = Record<string, unknown>;

interface ProductFromExcel {
  code: string;
  name: string;
  quantity: number;
  rowNumber: number;
  rawData: ExcelRow;
}

interface AnalysisResult {
  excelProducts: ProductFromExcel[];
  existingProducts: Map<string, { id: string; name: string; stockCurrent: number }>;
  productsToUpdate: Array<{
    code: string;
    name: string;
    quantity: number;
    existingProductId: string;
    currentStock: number;
    newTotalStock: number;
  }>;
  productsToCreate: Array<{
    code: string;
    name: string;
    quantity: number;
  }>;
  errors: Array<{ code: string; reason: string; row: number }>;
}

/**
 * Lee el archivo Excel y extrae los productos
 */
function readExcelFile(filePath: string): {
  products: ProductFromExcel[];
  errors: Array<{ code: string; reason: string; row: number }>;
  columns: string[];
} {
  console.log(`📖 Leyendo archivo: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`📄 Hoja encontrada: ${sheetName}\n`);

  // Convertir a JSON
  const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: '' });

  console.log(`📊 Total de filas en Excel: ${data.length}\n`);

  if (data.length === 0) {
    return { products: [], errors: [], columns: [] };
  }

  // Identificar columnas
  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  console.log('🔍 Columnas encontradas en el Excel:');
  columns.forEach((col, index) => {
    console.log(`   ${index + 1}. "${col}"`);
  });
  console.log('');

  // Buscar columnas relevantes (flexible con diferentes nombres)
  const findColumn = (possibleNames: string[]): string | null => {
    for (const name of possibleNames) {
      const found = columns.find(
        (col) => col.toUpperCase().trim() === name.toUpperCase().trim(),
      );
      if (found) return found;
    }
    return null;
  };

  const codeColumn = findColumn([
    'CODIGO',
    'CÓDIGO',
    'CODE',
    'CODI',
    'CÓDI',
    'COD',
    'N°',
    'Nº',
    'NUMERO',
    'NÚMERO',
  ]);

  const nameColumn = findColumn([
    'NOMBRE',
    'DESCRIPCION',
    'DESCRIPCIÓN',
    'DESCRIPTION',
    'DESCRIPCIÓ',
    'PRODUCTO',
    'PRODUCT',
  ]);

  const quantityColumn = findColumn([
    'CANTIDAD',
    'STOCK',
    'STOCK ACTUAL',
    'STOCK_ACTUAL',
    'STOCKACTUAL',
    'UNITATS',
    'UNIDADES',
    'QTY',
    'QUANTITY',
    'ESTOC',
    'ESTOCK',
    'ESTOC ACTUAL',
    'ESTOCK ACTUAL',
  ]);

  console.log('📋 Columnas identificadas:');
  console.log(`   Código: ${codeColumn || '❌ NO ENCONTRADA'}`);
  console.log(`   Nombre: ${nameColumn || '❌ NO ENCONTRADA'}`);
  console.log(`   Cantidad: ${quantityColumn || '❌ NO ENCONTRADA'}\n`);

  if (!codeColumn) {
    throw new Error(
      'No se encontró columna de código. Columnas disponibles: ' + columns.join(', '),
    );
  }

  if (!nameColumn) {
    throw new Error(
      'No se encontró columna de nombre. Columnas disponibles: ' + columns.join(', '),
    );
  }

  const products: ProductFromExcel[] = [];
  const errors: Array<{ code: string; reason: string; row: number }> = [];
  const codeSet = new Set<string>();

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 porque index empieza en 0 y la primera fila son headers

    const code = String(row[codeColumn] || '').trim();
    const name = String(row[nameColumn] || '').trim();
    const quantityRaw = quantityColumn ? row[quantityColumn] : null;

    // Intentar convertir cantidad a número
    let quantity = 0;
    if (quantityRaw !== null && quantityRaw !== undefined && quantityRaw !== '') {
      const qtyNum = Number(quantityRaw);
      if (!isNaN(qtyNum) && qtyNum >= 0) {
        quantity = Math.floor(qtyNum);
      }
    }

    // Validaciones
    if (!code) {
      errors.push({
        code: '',
        reason: 'Código vacío',
        row: rowNumber,
      });
      return;
    }

    if (!name) {
      errors.push({
        code,
        reason: 'Nombre vacío',
        row: rowNumber,
      });
      return;
    }

    // Validar código duplicado en Excel
    if (codeSet.has(code)) {
      errors.push({
        code,
        reason: 'Código duplicado en el Excel',
        row: rowNumber,
      });
      return;
    }

    codeSet.add(code);
    products.push({
      code,
      name,
      quantity,
      rowNumber,
      rawData: row,
    });
  });

  console.log(`✅ Productos válidos extraídos: ${products.length}`);
  console.log(`⚠️  Errores de validación: ${errors.length}\n`);

  return { products, errors, columns };
}

/**
 * Obtiene todos los productos existentes de Supabase
 */
async function getExistingProducts(): Promise<
  Map<string, { id: string; name: string; stockCurrent: number }>
> {
  console.log('🔍 Consultando productos existentes en Supabase...\n');

  const { data, error } = await supabase
    .from('products')
    .select('id, code, name, stock_current')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Error al consultar productos: ${error.message}`);
  }

  const productsMap = new Map<
    string,
    { id: string; name: string; stockCurrent: number }
  >();

  if (data) {
    data.forEach((product) => {
      productsMap.set(product.code, {
        id: product.id,
        name: product.name,
        stockCurrent: product.stock_current || 0,
      });
    });
  }

  console.log(`✅ Productos existentes en Supabase: ${productsMap.size}\n`);

  return productsMap;
}

/**
 * Analiza y compara productos del Excel con los existentes
 */
async function analyzeProducts(
  excelProducts: ProductFromExcel[],
  existingProducts: Map<string, { id: string; name: string; stockCurrent: number }>,
): Promise<AnalysisResult> {
  console.log('📊 Analizando productos...\n');

  const productsToUpdate: AnalysisResult['productsToUpdate'] = [];
  const productsToCreate: AnalysisResult['productsToCreate'] = [];

  excelProducts.forEach((excelProduct) => {
    const existing = existingProducts.get(excelProduct.code);

    if (existing) {
      // Producto existe: añadir a lista de actualización
      productsToUpdate.push({
        code: excelProduct.code,
        name: excelProduct.name,
        quantity: excelProduct.quantity,
        existingProductId: existing.id,
        currentStock: existing.stockCurrent,
        newTotalStock: existing.stockCurrent + excelProduct.quantity,
      });
    } else {
      // Producto no existe: añadir a lista de creación
      productsToCreate.push({
        code: excelProduct.code,
        name: excelProduct.name,
        quantity: excelProduct.quantity,
      });
    }
  });

  return {
    excelProducts,
    existingProducts,
    productsToUpdate,
    productsToCreate,
    errors: [],
  };
}

/**
 * Función principal
 */
async function main() {
  const excelPath = path.join(__dirname, 'Docs', 'davidbd.xlsx');

  console.log('='.repeat(80));
  console.log('📊 ANÁLISIS DE EXCEL OLIVA TORRAS (davidbd.xlsx)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Leer Excel
    console.log('📖 PASO 1: Leyendo archivo Excel');
    console.log('-'.repeat(80));
    const { products: excelProducts, errors: excelErrors } = readExcelFile(excelPath);

    if (excelProducts.length === 0) {
      console.error('❌ No se encontraron productos válidos en el Excel');
      process.exit(1);
    }

    // 2. Obtener productos existentes
    console.log('\n🔍 PASO 2: Consultando productos existentes en Supabase');
    console.log('-'.repeat(80));
    const existingProducts = await getExistingProducts();

    // 3. Analizar y comparar
    console.log('\n📊 PASO 3: Comparando productos');
    console.log('-'.repeat(80));
    const analysis = await analyzeProducts(excelProducts, existingProducts);

    // 4. Mostrar resultados
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN DEL ANÁLISIS');
    console.log('='.repeat(80));
    console.log('');

    console.log(`📦 Total productos en Excel: ${excelProducts.length}`);
    console.log(
      `✅ Productos que EXISTEN en Supabase: ${analysis.productsToUpdate.length}`,
    );
    console.log(`🆕 Productos NUEVOS a crear: ${analysis.productsToCreate.length}`);
    console.log(`⚠️  Errores en Excel: ${excelErrors.length}`);
    console.log('');

    // Detalles de productos a actualizar
    if (analysis.productsToUpdate.length > 0) {
      console.log('='.repeat(80));
      console.log('✅ PRODUCTOS QUE EXISTEN (se añadirá stock a OLIVA_TORRAS)');
      console.log('='.repeat(80));
      console.log('');

      const sampleUpdate = analysis.productsToUpdate.slice(0, 10);
      sampleUpdate.forEach((product, index) => {
        console.log(`${index + 1}. ${product.code} - ${product.name}`);
        console.log(`   Stock actual: ${product.currentStock}`);
        console.log(`   Cantidad a añadir (OLIVA_TORRAS): ${product.quantity}`);
        console.log(`   Nuevo stock total: ${product.newTotalStock}`);
        console.log('');
      });

      if (analysis.productsToUpdate.length > 10) {
        console.log(`   ... y ${analysis.productsToUpdate.length - 10} productos más\n`);
      }
    }

    // Detalles de productos a crear
    if (analysis.productsToCreate.length > 0) {
      console.log('='.repeat(80));
      console.log('🆕 PRODUCTOS NUEVOS A CREAR (con ubicación OLIVA_TORRAS)');
      console.log('='.repeat(80));
      console.log('');

      const sampleCreate = analysis.productsToCreate.slice(0, 10);
      sampleCreate.forEach((product, index) => {
        console.log(`${index + 1}. ${product.code} - ${product.name}`);
        console.log(`   Cantidad inicial (OLIVA_TORRAS): ${product.quantity}`);
        console.log('');
      });

      if (analysis.productsToCreate.length > 10) {
        console.log(`   ... y ${analysis.productsToCreate.length - 10} productos más\n`);
      }
    }

    // Errores
    if (excelErrors.length > 0) {
      console.log('='.repeat(80));
      console.log('⚠️  ERRORES EN EL EXCEL');
      console.log('='.repeat(80));
      console.log('');
      excelErrors.slice(0, 20).forEach((error, index) => {
        console.log(
          `${index + 1}. Fila ${error.row}${error.code ? ` (${error.code})` : ''}: ${error.reason}`,
        );
      });
      if (excelErrors.length > 20) {
        console.log(`   ... y ${excelErrors.length - 20} errores más\n`);
      }
    }

    // Plan de acción
    console.log('\n' + '='.repeat(80));
    console.log('📋 PLAN DE ACCIÓN');
    console.log('='.repeat(80));
    console.log('');

    console.log('Para productos EXISTENTES:');
    console.log('  1. Buscar el producto por código');
    console.log('  2. Verificar si ya tiene ubicación OLIVA_TORRAS');
    console.log(
      '  3. Si no tiene ubicación: crear nueva ubicación OLIVA_TORRAS con la cantidad',
    );
    console.log('  4. Si ya tiene ubicación: actualizar la cantidad sumando la nueva');
    console.log(
      '  5. El stock_total se actualizará automáticamente (trigger de Supabase)',
    );
    console.log('');

    console.log('Para productos NUEVOS:');
    console.log('  1. Crear producto nuevo con código, nombre y datos básicos');
    console.log('  2. Crear ubicación OLIVA_TORRAS con la cantidad especificada');
    console.log('  3. El stock_total se calculará automáticamente');
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('='.repeat(80));
    console.log('');
    console.log('⚠️  IMPORTANTE: Este análisis NO ha modificado la base de datos');
    console.log('   Para ejecutar los cambios, se necesita aprobación explícita');
    console.log('');
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR DURANTE EL ANÁLISIS');
    console.error('='.repeat(80));
    console.error(error);
    process.exit(1);
  }
}

main();
