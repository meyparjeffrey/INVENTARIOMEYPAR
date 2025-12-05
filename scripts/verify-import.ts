/**
 * Script para verificar que los productos importados aparezcan correctamente
 * en todas las búsquedas de la aplicación
 */

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

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyImport() {
  console.log("🔍 Verificando productos importados...\n");

  // 1. Verificar productos en la tabla products
  console.log("1️⃣ Verificando productos en la tabla 'products'...");
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("code, name, notes, stock_current, aisle, shelf, barcode, is_active")
    .eq("is_active", true)
    .order("code");

  if (productsError) {
    console.error("❌ Error al obtener productos:", productsError.message);
    process.exit(1);
  }

  console.log(`   ✅ Encontrados ${products?.length || 0} productos activos\n`);

  // 2. Verificar búsqueda por código
  console.log("2️⃣ Verificando búsqueda por código...");
  if (products && products.length > 0) {
    const testCode = products[0].code;
    const { data: searchByCode } = await supabase
      .from("products")
      .select("code, name")
      .ilike("code", `%${testCode}%`)
      .eq("is_active", true)
      .limit(5);

    if (searchByCode && searchByCode.length > 0) {
      console.log(`   ✅ Búsqueda por código funciona (ejemplo: "${testCode}")`);
    } else {
      console.log(`   ⚠️  Búsqueda por código no encontró resultados para "${testCode}"`);
    }
  }
  console.log();

  // 3. Verificar búsqueda por nombre
  console.log("3️⃣ Verificando búsqueda por nombre...");
  if (products && products.length > 0) {
    const testName = products[0].name?.substring(0, 10) || "";
    const { data: searchByName } = await supabase
      .from("products")
      .select("code, name")
      .ilike("name", `%${testName}%`)
      .eq("is_active", true)
      .limit(5);

    if (searchByName && searchByName.length > 0) {
      console.log(`   ✅ Búsqueda por nombre funciona (ejemplo: "${testName}...")`);
    } else {
      console.log(`   ⚠️  Búsqueda por nombre no encontró resultados para "${testName}"`);
    }
  }
  console.log();

  // 4. Verificar búsqueda por barcode
  console.log("4️⃣ Verificando búsqueda por barcode...");
  const productsWithBarcode = products?.filter(p => p.barcode) || [];
  if (productsWithBarcode.length > 0) {
    const testBarcode = productsWithBarcode[0].barcode;
    const { data: searchByBarcode } = await supabase
      .from("products")
      .select("code, name, barcode")
      .ilike("barcode", `%${testBarcode}%`)
      .eq("is_active", true)
      .limit(5);

    if (searchByBarcode && searchByBarcode.length > 0) {
      console.log(`   ✅ Búsqueda por barcode funciona (ejemplo: "${testBarcode}")`);
    } else {
      console.log(`   ⚠️  Búsqueda por barcode no encontró resultados para "${testBarcode}"`);
    }
  } else {
    console.log("   ⚠️  No hay productos con barcode para probar");
  }
  console.log();

  // 5. Verificar productos con código de proveedor en notes
  console.log("5️⃣ Verificando productos con código de proveedor...");
  const productsWithSupplierCode = products?.filter(p => 
    p.notes && p.notes.includes("Código proveedor:")
  ) || [];
  console.log(`   ✅ ${productsWithSupplierCode.length} productos tienen código de proveedor en 'notes'`);
  if (productsWithSupplierCode.length > 0) {
    console.log(`   Ejemplo: ${productsWithSupplierCode[0].code} - ${productsWithSupplierCode[0].notes}`);
  }
  console.log();

  // 6. Verificar productos con ubicación
  console.log("6️⃣ Verificando productos con ubicación...");
  const productsWithLocation = products?.filter(p => p.aisle && p.shelf) || [];
  console.log(`   ✅ ${productsWithLocation.length} productos tienen ubicación (aisle + shelf)`);
  if (productsWithLocation.length > 0) {
    console.log(`   Ejemplo: ${productsWithLocation[0].code} - ${productsWithLocation[0].aisle}/${productsWithLocation[0].shelf}`);
  }
  console.log();

  // 7. Verificar productos con barcode
  console.log("7️⃣ Verificando productos con barcode...");
  console.log(`   ✅ ${productsWithBarcode.length} productos tienen barcode`);
  if (productsWithBarcode.length > 0) {
    console.log(`   Ejemplo: ${productsWithBarcode[0].code} - ${productsWithBarcode[0].barcode}`);
  }
  console.log();

  // 8. Verificar que los productos sean buscables en ProductSelector (para lotes)
  console.log("8️⃣ Verificando búsqueda para ProductSelector (lotes)...");
  if (products && products.length > 0) {
    const testProduct = products[0];
    const searchTerm = testProduct.code?.substring(0, 5) || "";
    
    // Simular la búsqueda que hace ProductSelector
    const { data: productSelectorSearch } = await supabase
      .from("products")
      .select("code, name, stock_current, category, is_batch_tracked")
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .eq("is_active", true)
      .limit(10);

    if (productSelectorSearch && productSelectorSearch.length > 0) {
      console.log(`   ✅ Búsqueda de ProductSelector funciona (término: "${searchTerm}")`);
      console.log(`   Encontrados: ${productSelectorSearch.length} productos`);
    } else {
      console.log(`   ⚠️  Búsqueda de ProductSelector no encontró resultados para "${searchTerm}"`);
    }
  }
  console.log();

  // 9. Resumen final
  console.log("📊 RESUMEN FINAL:");
  console.log(`   Total productos activos: ${products?.length || 0}`);
  console.log(`   Con código proveedor: ${productsWithSupplierCode.length}`);
  console.log(`   Con ubicación: ${productsWithLocation.length}`);
  console.log(`   Con barcode: ${productsWithBarcode.length}`);
  console.log();

  // 10. Mostrar algunos ejemplos
  if (products && products.length > 0) {
    console.log("📦 Ejemplos de productos importados:");
    products.slice(0, 5).forEach((p: any) => {
      console.log(`   - ${p.code}: ${p.name}`);
      if (p.notes) console.log(`     Notas: ${p.notes}`);
      if (p.aisle && p.shelf) console.log(`     Ubicación: ${p.aisle}/${p.shelf}`);
      if (p.barcode) console.log(`     Barcode: ${p.barcode}`);
      console.log(`     Stock: ${p.stock_current}`);
      console.log();
    });
  }

  console.log("✅ Verificación completada!");
}

verifyImport().catch(console.error);

