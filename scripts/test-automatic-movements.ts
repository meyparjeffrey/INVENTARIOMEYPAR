/**
 * Script de prueba para verificar el registro automático de movimientos
 * cuando se editan productos.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
);

async function testAutomaticMovements() {
  console.log("🧪 Iniciando pruebas de movimientos automáticos...\n");

  // Obtener 4 productos para probar
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, code, name, stock_current, supplier_code, barcode")
    .eq("is_active", true)
    .limit(4);

  if (productsError || !products || products.length < 4) {
    console.error("❌ Error obteniendo productos:", productsError);
    return;
  }

  console.log(`✅ Obtenidos ${products.length} productos para probar\n`);

  // Obtener un usuario para las pruebas
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUserId = users?.[0]?.id;

  if (!testUserId) {
    console.error("❌ No se encontró ningún usuario para las pruebas");
    return;
  }

  console.log(`✅ Usuario de prueba: ${testUserId}\n`);

  // Contar movimientos iniciales
  const { count: initialCount } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Movimientos iniciales: ${initialCount}\n`);

  // Prueba 1: Cambiar stock, nombre, supplier_code y barcode
  console.log("🔹 PRUEBA 1: Producto 1 - Cambio de stock, nombre, supplier_code y barcode");
  const product1 = products[0];
  const product1Before = { ...product1 };

  const { data: updated1, error: error1 } = await supabase
    .from("products")
    .update({
      stock_current: (product1.stock_current || 0) + 23,
      name: `${product1.name} - TEST SYNC 1`,
      supplier_code: "PROV-TEST-001",
      barcode: "TEST-BARCODE-001",
      updated_at: new Date().toISOString()
    })
    .eq("id", product1.id)
    .select()
    .single();

  if (error1) {
    console.error("   ❌ Error actualizando producto 1:", error1);
  } else {
    console.log("   ✅ Producto 1 actualizado");
    console.log(`      Stock: ${product1Before.stock_current} → ${updated1.stock_current}`);
    console.log(`      Nombre: "${product1Before.name}" → "${updated1.name}"`);
    console.log(`      Supplier Code: ${product1Before.supplier_code || "null"} → ${updated1.supplier_code}`);
    console.log(`      Barcode: ${product1Before.barcode || "null"} → ${updated1.barcode}`);
  }

  // Esperar un momento para que se procese
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Verificar movimientos
  const { data: movements1, count: count1 } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact" })
    .eq("product_id", product1.id)
    .order("movement_date", { ascending: false });

  console.log(`   📊 Movimientos registrados para producto 1: ${count1 || 0}`);
  if (movements1 && movements1.length > 0) {
    movements1.forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason} (Qty: ${m.quantity})`);
    });
  }
  console.log("");

  // Prueba 2: Cambiar solo nombre y supplier_code (sin stock)
  console.log("🔹 PRUEBA 2: Producto 2 - Cambio de nombre y supplier_code (sin stock)");
  const product2 = products[1];
  const product2Before = { ...product2 };

  const { data: updated2, error: error2 } = await supabase
    .from("products")
    .update({
      name: `${product2.name} - TEST SYNC 2`,
      supplier_code: "PROV-TEST-002",
      updated_at: new Date().toISOString()
    })
    .eq("id", product2.id)
    .select()
    .single();

  if (error2) {
    console.error("   ❌ Error actualizando producto 2:", error2);
  } else {
    console.log("   ✅ Producto 2 actualizado");
    console.log(`      Nombre: "${product2Before.name}" → "${updated2.name}"`);
    console.log(`      Supplier Code: ${product2Before.supplier_code || "null"} → ${updated2.supplier_code}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: movements2, count: count2 } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact" })
    .eq("product_id", product2.id)
    .order("movement_date", { ascending: false });

  console.log(`   📊 Movimientos registrados para producto 2: ${count2 || 0}`);
  if (movements2 && movements2.length > 0) {
    movements2.forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason} (Qty: ${m.quantity})`);
    });
  }
  console.log("");

  // Prueba 3: Cambiar stock y barcode
  console.log("🔹 PRUEBA 3: Producto 3 - Cambio de stock y barcode");
  const product3 = products[2];
  const product3Before = { ...product3 };

  const { data: updated3, error: error3 } = await supabase
    .from("products")
    .update({
      stock_current: (product3.stock_current || 0) + 21,
      barcode: "TEST-BARCODE-003",
      updated_at: new Date().toISOString()
    })
    .eq("id", product3.id)
    .select()
    .single();

  if (error3) {
    console.error("   ❌ Error actualizando producto 3:", error3);
  } else {
    console.log("   ✅ Producto 3 actualizado");
    console.log(`      Stock: ${product3Before.stock_current} → ${updated3.stock_current}`);
    console.log(`      Barcode: ${product3Before.barcode || "null"} → ${updated3.barcode}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: movements3, count: count3 } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact" })
    .eq("product_id", product3.id)
    .order("movement_date", { ascending: false });

  console.log(`   📊 Movimientos registrados para producto 3: ${count3 || 0}`);
  if (movements3 && movements3.length > 0) {
    movements3.forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason} (Qty: ${m.quantity})`);
    });
  }
  console.log("");

  // Prueba 4: Cambiar solo código y ubicación (sin stock)
  console.log("🔹 PRUEBA 4: Producto 4 - Cambio de código y ubicación (sin stock)");
  const product4 = products[3];
  const product4Before = { ...product4 };

  const { data: updated4, error: error4 } = await supabase
    .from("products")
    .update({
      code: `${product4.code}-TEST`,
      aisle: "A-TEST",
      shelf: "E-TEST",
      updated_at: new Date().toISOString()
    })
    .eq("id", product4.id)
    .select()
    .single();

  if (error4) {
    console.error("   ❌ Error actualizando producto 4:", error4);
  } else {
    console.log("   ✅ Producto 4 actualizado");
    console.log(`      Código: "${product4Before.code}" → "${updated4.code}"`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: movements4, count: count4 } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact" })
    .eq("product_id", product4.id)
    .order("movement_date", { ascending: false });

  console.log(`   📊 Movimientos registrados para producto 4: ${count4 || 0}`);
  if (movements4 && movements4.length > 0) {
    movements4.forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason} (Qty: ${m.quantity})`);
    });
  }
  console.log("");

  // Resumen final
  const { count: finalCount } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true });

  console.log("📊 RESUMEN FINAL:");
  console.log(`   Movimientos iniciales: ${initialCount}`);
  console.log(`   Movimientos finales: ${finalCount}`);
  console.log(`   Movimientos nuevos: ${(finalCount || 0) - (initialCount || 0)}`);
  console.log("");

  if ((finalCount || 0) > (initialCount || 0)) {
    console.log("✅ ¡PRUEBAS EXITOSAS! Los movimientos se están registrando correctamente.");
  } else {
    console.log("⚠️  ADVERTENCIA: No se registraron movimientos nuevos. Verificar la lógica de registro automático.");
  }
}

testAutomaticMovements().catch(console.error);

