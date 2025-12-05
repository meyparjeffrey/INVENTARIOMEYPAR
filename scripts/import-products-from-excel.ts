/**
 * Script para importar productos desde un archivo Excel y reemplazar los existentes.
 * 
 * Uso:
 *   ts-node --project tsconfig.node.json scripts/import-products-from-excel.ts <ruta-al-excel>
 * 
 * Formato Excel esperado:
 *   - Columnas: CODIGO, NOMBRE, COD. PRODUCTO PROVEEDOR
 *   - Primera fila: encabezados
 *   - Filas siguientes: datos
 */

import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const __dirname = path.resolve();

// Cargar variables de entorno
const loadEnv = () => {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value;
        }
      }
    });
  }
};

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Error: Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ExcelRow {
  CODIGO: string;
  NOMBRE?: string;
  DESCRIPCION?: string;
  "COD. PRODUCTO PROVEEDOR"?: string;
  "Cód. producto proveedor"?: string;
  "codigo"?: string;
  "descripcion"?: string;
  "codigo producto proveedor"?: string;
}

interface ProductToImport {
  code: string;
  name: string;
  supplierCode?: string;
}

interface ValidationError {
  row: number;
  code?: string;
  reason: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ code: string; reason: string }>;
  skipped: number;
}

/**
 * Genera valores aleatorios para stock_min y stock_max.
 */
function generateRandomStockValues(): { stockMin: number; stockMax: number } {
  const stockMin = Math.floor(Math.random() * (20 - 5 + 1)) + 5; // 5-20
  const stockMax = Math.floor(Math.random() * (200 - 50 + 1)) + 50; // 50-200
  return { stockMin, stockMax };
}

/**
 * Genera ubicación aleatoria (aisle y shelf).
 */
function generateRandomLocation(): { aisle: string; shelf: string } {
  const aisles = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E1", "E2"];
  const shelves = ["E1", "E2", "E3", "E4", "E5"];
  
  const aisle = aisles[Math.floor(Math.random() * aisles.length)];
  const shelf = shelves[Math.floor(Math.random() * shelves.length)];
  
  return { aisle, shelf };
}

/**
 * Genera un barcode aleatorio.
 */
function generateRandomBarcode(): string {
  return Math.random().toString(36).substring(2, 15).toUpperCase();
}

/**
 * Lee el archivo Excel y extrae los productos con validación mejorada.
 */
function readExcelFile(filePath: string): {
  products: ProductToImport[];
  errors: ValidationError[];
} {
  console.log(`📖 Leyendo archivo: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convertir a JSON
  const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

  console.log(`✅ Encontradas ${data.length} filas en el Excel`);

  const products: ProductToImport[] = [];
  const errors: ValidationError[] = [];
  const codeSet = new Set<string>();

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 porque index empieza en 0 y la primera fila son headers
    // Aceptar tanto mayúsculas como minúsculas en los nombres de columnas
    const code = String(
      row.CODIGO || row.codigo || 
      (row as any)["CODIGO"] || (row as any)["codigo"] || ""
    ).trim();
    const name = String(
      row.NOMBRE || row.DESCRIPCION || row.descripcion || 
      (row as any)["NOMBRE"] || (row as any)["DESCRIPCION"] || 
      (row as any)["descripcion"] || ""
    ).trim();
    const supplierCode =
      row["COD. PRODUCTO PROVEEDOR"] || row["Cód. producto proveedor"] ||
      row["codigo producto proveedor"] || (row as any)["COD. PRODUCTO PROVEEDOR"] ||
      (row as any)["codigo producto proveedor"]
        ? String(
            row["COD. PRODUCTO PROVEEDOR"] || row["Cód. producto proveedor"] ||
            row["codigo producto proveedor"] || (row as any)["COD. PRODUCTO PROVEEDOR"] ||
            (row as any)["codigo producto proveedor"]
          ).trim()
        : undefined;

    // Validación: código vacío
    if (!code) {
      errors.push({
        row: rowNumber,
        reason: "Código vacío"
      });
      return;
    }

    // Validación: nombre vacío
    if (!name) {
      errors.push({
        row: rowNumber,
        code,
        reason: "Nombre vacío"
      });
      return;
    }

    // Validación: código duplicado en el Excel
    if (codeSet.has(code)) {
      errors.push({
        row: rowNumber,
        code,
        reason: "Código duplicado en el archivo Excel"
      });
      return;
    }

    // Validación: formato de código (longitud mínima 1, máximo 50 caracteres)
    if (code.length < 1 || code.length > 50) {
      errors.push({
        row: rowNumber,
        code,
        reason: `Código inválido: debe tener entre 1 y 50 caracteres (tiene ${code.length})`
      });
      return;
    }

    // Validación: nombre debe tener al menos 3 caracteres
    if (name.length < 3) {
      errors.push({
        row: rowNumber,
        code,
        reason: `Nombre inválido: debe tener al menos 3 caracteres (tiene ${name.length})`
      });
      return;
    }

    // Validación: caracteres permitidos en código (alfanumérico, guiones, guiones bajos)
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      errors.push({
        row: rowNumber,
        code,
        reason: "Código inválido: solo se permiten letras, números, guiones y guiones bajos"
      });
      return;
    }

    codeSet.add(code);
    products.push({
      code,
      name,
      supplierCode: supplierCode || undefined
    });
  });

  if (errors.length > 0) {
    console.warn(`\n⚠️  Se encontraron ${errors.length} errores de validación:`);
    errors.forEach((error) => {
      console.warn(`   Fila ${error.row}${error.code ? ` (${error.code})` : ""}: ${error.reason}`);
    });
  }

  console.log(`✅ Productos válidos: ${products.length}`);
  console.log(`⚠️  Productos con errores: ${errors.length}`);

  return { products, errors };
}

/**
 * Crea un backup de todos los productos activos antes de la importación.
 */
async function backupProducts(): Promise<string> {
  console.log("💾 Creando backup de productos existentes...");

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Error al crear backup: ${error.message}`);
  }

  const backupDir = path.join(__dirname, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `backup-products-${timestamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`✅ Backup creado: ${backupPath}`);
  console.log(`   Productos en backup: ${data?.length || 0}`);

  return backupPath;
}

/**
 * Importa o actualiza productos según la opción seleccionada.
 * @param products - Productos a importar
 * @param adminUserId - ID del usuario admin
 * @param overwriteExisting - Si true, sobrescribe productos existentes. Si false, solo crea nuevos.
 */
async function importOrUpdateProducts(
  products: ProductToImport[],
  adminUserId: string,
  overwriteExisting: boolean = true
): Promise<ImportResult> {
  console.log(`📦 Procesando ${products.length} productos...`);

  const result: ImportResult = {
    created: 0,
    updated: 0,
    errors: [],
    skipped: 0
  };

  const batchSize = 100;
  const startTime = Date.now();

  // Si se elige "Sobrescribir todos", primero eliminar productos que NO están en el Excel
  if (overwriteExisting) {
    console.log("\n🗑️  Eliminando productos que NO están en el Excel...");
    
    // Obtener todos los códigos del Excel
    const excelCodes = new Set(products.map(p => p.code));
    
    // Obtener todos los productos activos de la base de datos
    const { data: allProducts, error: fetchAllError } = await supabase
      .from("products")
      .select("id, code")
      .eq("is_active", true);
    
    if (fetchAllError) {
      console.error("⚠️  Error al obtener productos existentes:", fetchAllError.message);
    } else if (allProducts) {
      // Identificar productos a eliminar (existen en BD pero no en Excel)
      const productsToDelete = allProducts.filter(p => !excelCodes.has(p.code));
      
      if (productsToDelete.length > 0) {
        console.log(`   Encontrados ${productsToDelete.length} productos a eliminar`);
        
        // Eliminar en lotes
        for (let i = 0; i < productsToDelete.length; i += batchSize) {
          const batch = productsToDelete.slice(i, i + batchSize);
          const ids = batch.map(p => p.id);
          
          const { error: deleteError } = await supabase
            .from("products")
            .delete()
            .in("id", ids);
          
          if (deleteError) {
            console.error(`   ⚠️  Error al eliminar lote ${Math.floor(i / batchSize) + 1}:`, deleteError.message);
          } else {
            console.log(`   ✅ Eliminados ${Math.min(i + batchSize, productsToDelete.length)}/${productsToDelete.length} productos`);
          }
        }
        
        console.log(`✅ Eliminación completada: ${productsToDelete.length} productos eliminados`);
      } else {
        console.log("   ✅ No hay productos a eliminar (todos están en el Excel)");
      }
    }
  }

  // Procesar en lotes
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(products.length / batchSize);

    console.log(`\n📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)...`);

    // Procesar cada producto del lote
    for (const product of batch) {
      try {
        // Verificar si el producto existe
        const { data: existing, error: fetchError } = await supabase
          .from("products")
          .select("id, is_active")
          .eq("code", product.code)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 = no rows returned (producto no existe)
          result.errors.push({
            code: product.code,
            reason: `Error al verificar existencia: ${fetchError.message}`
          });
          continue;
        }

        if (existing) {
          // Producto existe
          if (overwriteExisting) {
            // Opción: Sobrescribir todos - actualizar producto existente
            // IMPORTANTE: Mantener stock_current, aisle, shelf, barcode
            // Solo actualizar: name, notes (código proveedor)
            const { error: updateError } = await supabase
              .from("products")
              .update({
                name: product.name,
                notes: product.supplierCode ? `Código proveedor: ${product.supplierCode}` : null,
                is_active: true, // Reactivar si estaba desactivado
                updated_at: new Date().toISOString()
                // NO modificar: stock_current, aisle, shelf, barcode, stock_min, stock_max
              })
              .eq("id", existing.id);

            if (updateError) {
              result.errors.push({
                code: product.code,
                reason: `Error al actualizar: ${updateError.message}`
              });
            } else {
              result.updated++;
            }
          } else {
            // Opción: Solo nuevos - omitir productos existentes (mantener stock)
            result.skipped++;
          }
        } else {
          // Producto no existe: crear nuevo
          const { stockMin, stockMax } = generateRandomStockValues();
          const { aisle, shelf } = generateRandomLocation();
          const barcode = generateRandomBarcode();

          const { error: insertError } = await supabase
            .from("products")
            .insert({
              code: product.code,
              name: product.name,
              barcode: barcode,
              description: null,
              category: null,
              stock_current: 0,
              stock_min: stockMin,
              stock_max: stockMax,
              aisle,
              shelf,
              location_extra: null,
              cost_price: 0,
              sale_price: null,
              purchase_url: null,
              image_url: null,
              is_active: true,
              is_batch_tracked: false,
              unit_of_measure: null,
              weight_kg: null,
              dimensions_cm: null,
              notes: product.supplierCode ? `Código proveedor: ${product.supplierCode}` : null,
              created_by: adminUserId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            result.errors.push({
              code: product.code,
              reason: `Error al crear: ${insertError.message}`
            });
          } else {
            result.created++;
          }
        }
      } catch (error: any) {
        result.errors.push({
          code: product.code,
          reason: `Error inesperado: ${error?.message || String(error)}`
        });
      }
    }

    const processed = Math.min(i + batchSize, products.length);
    console.log(`  ✅ Procesados ${processed}/${products.length} productos`);
    console.log(`     Creados: ${result.created} | Actualizados: ${result.updated} | Errores: ${result.errors.length}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Tiempo total: ${duration} segundos`);

  return result;
}

/**
 * Obtiene el ID del primer usuario ADMIN.
 */
async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `No se encontró un usuario ADMIN. Error: ${error?.message || "Sin datos"}`
    );
  }

  return data.id;
}

/**
 * Función principal.
 */
async function main() {
  const excelPath = process.argv[2];

  if (!excelPath) {
    console.error("❌ Error: Debes proporcionar la ruta al archivo Excel");
    console.error("Uso: ts-node scripts/import-products-from-excel.ts <ruta-al-excel>");
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // 1. Leer Excel con validación mejorada
    console.log("=".repeat(60));
    console.log("📖 PASO 1: Leyendo y validando archivo Excel");
    console.log("=".repeat(60));
    const { products, errors: validationErrors } = readExcelFile(excelPath);
    
    if (products.length === 0) {
      console.error("\n❌ No hay productos válidos para importar");
      if (validationErrors.length > 0) {
        console.error("   Revisa los errores de validación arriba");
      }
      process.exit(1);
    }

    console.log(`\n📋 Productos válidos a procesar: ${products.length}`);
    if (validationErrors.length > 0) {
      console.log(`⚠️  Productos con errores de validación: ${validationErrors.length}`);
    }

    // 2. Obtener ID de admin
    console.log("\n" + "=".repeat(60));
    console.log("👤 PASO 2: Verificando usuario ADMIN");
    console.log("=".repeat(60));
    const adminUserId = await getAdminUserId();
    console.log(`✅ Usuario ADMIN encontrado: ${adminUserId}`);

    // 3. Crear backup
    console.log("\n" + "=".repeat(60));
    console.log("💾 PASO 3: Creando backup de productos existentes");
    console.log("=".repeat(60));
    const backupPath = await backupProducts();

    // 4. Preguntar al usuario qué hacer con productos existentes
    console.log("\n" + "=".repeat(60));
    console.log("📦 PASO 4: Opciones de importación");
    console.log("=".repeat(60));
    console.log("Opciones:");
    console.log("  1. Sobrescribir todos (actualizar productos existentes)");
    console.log("  2. Solo añadir nuevos (mantener stock de existentes)");
    
    // Por defecto, usar solo nuevos para mantener stock
    const overwriteExisting = process.argv.includes("--overwrite") || process.argv.includes("-o");
    
    if (overwriteExisting) {
      console.log("\n⚠️  MODO: Sobrescribir todos los productos existentes");
    } else {
      console.log("\n✅ MODO: Solo añadir productos nuevos (mantener stock de existentes)");
    }

    // 5. Importar o actualizar productos
    console.log("\n" + "=".repeat(60));
    console.log("📦 PASO 5: Importando/Actualizando productos");
    console.log("=".repeat(60));
    const result = await importOrUpdateProducts(products, adminUserId, overwriteExisting);

    // 6. Resumen final
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMEN FINAL");
    console.log("=".repeat(60));
    console.log(`✅ Productos creados: ${result.created}`);
    if (overwriteExisting) {
      console.log(`🔄 Productos actualizados: ${result.updated}`);
    } else {
      console.log(`⏭️  Productos omitidos (ya existían): ${result.skipped}`);
    }
    console.log(`❌ Errores: ${result.errors.length}`);
    console.log(`⚠️  Omitidos (validación): ${validationErrors.length}`);
    console.log(`\n💾 Backup guardado en: ${backupPath}`);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tiempo total de importación: ${totalDuration} segundos`);

    if (result.errors.length > 0) {
      console.log("\n⚠️  Errores durante la importación:");
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.code}: ${error.reason}`);
      });
    }

    if (validationErrors.length > 0) {
      console.log("\n⚠️  Errores de validación (productos no procesados):");
      validationErrors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. Fila ${error.row}${error.code ? ` (${error.code})` : ""}: ${error.reason}`);
      });
      if (validationErrors.length > 10) {
        console.log(`   ... y ${validationErrors.length - 10} errores más`);
      }
    }

    const successRate = ((result.created + result.updated) / products.length * 100).toFixed(1);
    console.log(`\n📈 Tasa de éxito: ${successRate}%`);

    console.log("\n✅ ¡Importación completada!");
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ ERROR DURANTE LA IMPORTACIÓN");
    console.error("=".repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();

