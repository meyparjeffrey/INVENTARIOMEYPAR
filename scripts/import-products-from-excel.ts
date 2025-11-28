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
  NOMBRE: string;
  "COD. PRODUCTO PROVEEDOR"?: string;
  "Cód. producto proveedor"?: string;
}

interface ProductToImport {
  code: string;
  name: string;
  supplierCode?: string;
}

/**
 * Lee el archivo Excel y extrae los productos.
 */
function readExcelFile(filePath: string): ProductToImport[] {
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

  const products = data
    .map((row): ProductToImport | null => {
      const code = String(row.CODIGO || "").trim();
      const name = String(row.NOMBRE || "").trim();
      const supplierCode =
        row["COD. PRODUCTO PROVEEDOR"] || row["Cód. producto proveedor"]
          ? String(
              row["COD. PRODUCTO PROVEEDOR"] || row["Cód. producto proveedor"]
            ).trim()
          : undefined;

      if (!code || !name) {
        console.warn(`⚠️  Fila omitida: código o nombre vacío`, row);
        return null;
      }

      return {
        code,
        name,
        supplierCode: supplierCode || undefined
      };
    })
    .filter((p): p is ProductToImport => p !== null);

  return products;
}

/**
 * Elimina todos los productos existentes (baja lógica).
 */
async function deactivateAllProducts(): Promise<void> {
  console.log("🗑️  Desactivando productos existentes...");

  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true);

  if (error) {
    throw new Error(`Error al desactivar productos: ${error.message}`);
  }

  console.log("✅ Productos existentes desactivados");
}

/**
 * Importa los productos nuevos.
 */
async function importProducts(
  products: ProductToImport[],
  adminUserId: string
): Promise<void> {
  console.log(`📦 Importando ${products.length} productos...`);

  const productsToInsert = products.map((p) => ({
    code: p.code,
    name: p.name,
    barcode: p.supplierCode || null,
    description: null,
    category: null,
    stock_current: 0,
    stock_min: 0,
    stock_max: null,
    aisle: "A1", // Valor por defecto, se puede editar después
    shelf: "E1", // Valor por defecto
    location_extra: null,
    cost_price: 0,
    sale_price: null,
    purchase_url: null,
    image_url: null,
    is_active: true,
    is_batch_tracked: false, // Por defecto sin lotes
    unit_of_measure: null,
    weight_kg: null,
    dimensions_cm: null,
    notes: p.supplierCode ? `Código proveedor: ${p.supplierCode}` : null,
    created_by: adminUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  // Insertar en lotes de 100 para evitar problemas de tamaño
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase.from("products").insert(batch).select();

    if (error) {
      console.error(`❌ Error al insertar lote ${i / batchSize + 1}:`, error.message);
      throw error;
    }

    inserted += data?.length || 0;
    console.log(`  ✅ Insertados ${inserted}/${productsToInsert.length} productos`);
  }

  console.log(`✅ Importación completada: ${inserted} productos creados`);
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

  try {
    // 1. Leer Excel
    const products = readExcelFile(excelPath);
    console.log(`\n📋 Productos a importar: ${products.length}\n`);

    // 2. Obtener ID de admin
    const adminUserId = await getAdminUserId();
    console.log(`👤 Usuario ADMIN: ${adminUserId}\n`);

    // 3. Desactivar productos existentes
    await deactivateAllProducts();
    console.log();

    // 4. Importar nuevos productos
    await importProducts(products, adminUserId);

    console.log("\n✅ ¡Importación completada exitosamente!");
    console.log(
      `\n📊 Resumen:\n   - Productos desactivados: todos los anteriores\n   - Productos nuevos: ${products.length}`
    );
  } catch (error) {
    console.error("\n❌ Error durante la importación:", error);
    process.exit(1);
  }
}

main();

