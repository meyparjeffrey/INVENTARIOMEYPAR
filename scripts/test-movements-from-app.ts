/**
 * Script de prueba que simula ediciones desde la aplicación
 * usando el mismo código que usa la app (ProductService)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { ProductService } from "../src/application/services/ProductService";
import { MovementService } from "../src/application/services/MovementService";
import { SupabaseProductRepository } from "../src/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryMovementRepository } from "../src/infrastructure/repositories/SupabaseInventoryMovementRepository";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false }
  }
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
);

async function testMovementsFromApp() {
  console.log("🧪 Iniciando pruebas de movimientos automáticos desde la app...\n");

  // Obtener productos
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, code, name, stock_current, supplier_code, barcode, aisle, shelf")
    .eq("is_active", true)
    .limit(4);

  if (productsError || !products || products.length < 4) {
    console.error("❌ Error obteniendo productos:", productsError);
    return;
  }

  console.log(`✅ Obtenidos ${products.length} productos para probar\n`);

  // Obtener un usuario
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const testUserId = users?.[0]?.id;

  if (!testUserId) {
    console.error("❌ No se encontró ningún usuario");
    return;
  }

  console.log(`✅ Usuario de prueba: ${testUserId}\n`);

  // Contar movimientos iniciales
  const { count: initialCount } = await supabaseAdmin
    .from("inventory_movements")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Movimientos iniciales: ${initialCount}\n`);

  // Inicializar servicios (igual que en la app)
  const productRepository = new SupabaseProductRepository(supabase);
  const movementRepository = new SupabaseInventoryMovementRepository(supabase);
  const movementService = new MovementService(movementRepository, productRepository);
  const productService = new ProductService(productRepository, movementService);

  // PRUEBA 1: Cambiar stock, nombre, supplier_code y barcode
  console.log("🔹 PRUEBA 1: Producto 1 - Cambio de stock, nombre, supplier_code y barcode");
  const product1 = products[0];
  console.log(`   Producto: ${product1.code} - ${product1.name}`);
  console.log(`   Stock actual: ${product1.stock_current}`);
  console.log(`   Supplier Code: ${product1.supplier_code || "null"}`);
  console.log(`   Barcode: ${product1.barcode || "null"}`);

  try {
    const updated1 = await productService.update(product1.id, {
      stockCurrent: (product1.stock_current || 0) + 25,
      name: `${product1.name} - TEST APP 1`,
      supplierCode: "PROV-APP-001",
      barcode: "TEST-APP-BARCODE-001"
    }, testUserId);

    console.log("   ✅ Producto 1 actualizado desde ProductService");
    console.log(`      Stock: ${product1.stock_current} → ${updated1.stockCurrent}`);
    console.log(`      Nombre: "${product1.name}" → "${updated1.name}"`);
    console.log(`      Supplier Code: ${product1.supplier_code || "null"} → ${updated1.supplierCode || "null"}`);
    console.log(`      Barcode: ${product1.barcode || "null"} → ${updated1.barcode || "null"}`);

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar movimientos
    const { data: movements1, count: count1 } = await supabaseAdmin
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .eq("product_id", product1.id)
      .order("movement_date", { ascending: false });

    console.log(`   📊 Movimientos registrados para producto 1: ${count1 || 0}`);
    if (movements1 && movements1.length > 0) {
      movements1.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason}`);
        console.log(`         Qty: ${m.quantity}, Before: ${m.quantity_before}, After: ${m.quantity_after}`);
        console.log(`         User: ${m.user_id}, Date: ${m.movement_date}`);
      });
    } else {
      console.log("      ⚠️  No se registraron movimientos");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
  }
  console.log("");

  // PRUEBA 2: Cambiar solo nombre y supplier_code (sin stock)
  console.log("🔹 PRUEBA 2: Producto 2 - Cambio de nombre y supplier_code (sin stock)");
  const product2 = products[1];
  console.log(`   Producto: ${product2.code} - ${product2.name}`);
  console.log(`   Stock actual: ${product2.stock_current}`);

  try {
    const updated2 = await productService.update(product2.id, {
      name: `${product2.name} - TEST APP 2`,
      supplierCode: "PROV-APP-002"
    }, testUserId);

    console.log("   ✅ Producto 2 actualizado desde ProductService");
    console.log(`      Nombre: "${product2.name}" → "${updated2.name}"`);
    console.log(`      Supplier Code: ${product2.supplier_code || "null"} → ${updated2.supplierCode || "null"}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: movements2, count: count2 } = await supabaseAdmin
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .eq("product_id", product2.id)
      .order("movement_date", { ascending: false });

    console.log(`   📊 Movimientos registrados para producto 2: ${count2 || 0}`);
    if (movements2 && movements2.length > 0) {
      movements2.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason}`);
        console.log(`         Qty: ${m.quantity}, Comments: ${m.comments}`);
      });
    } else {
      console.log("      ⚠️  No se registraron movimientos");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }
  console.log("");

  // PRUEBA 3: Cambiar stock y barcode
  console.log("🔹 PRUEBA 3: Producto 3 - Cambio de stock y barcode");
  const product3 = products[2];
  console.log(`   Producto: ${product3.code} - ${product3.name}`);
  console.log(`   Stock actual: ${product3.stock_current}`);

  try {
    const updated3 = await productService.update(product3.id, {
      stockCurrent: (product3.stock_current || 0) + 15,
      barcode: "TEST-APP-BARCODE-003"
    }, testUserId);

    console.log("   ✅ Producto 3 actualizado desde ProductService");
    console.log(`      Stock: ${product3.stock_current} → ${updated3.stockCurrent}`);
    console.log(`      Barcode: ${product3.barcode || "null"} → ${updated3.barcode || "null"}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: movements3, count: count3 } = await supabaseAdmin
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .eq("product_id", product3.id)
      .order("movement_date", { ascending: false });

    console.log(`   📊 Movimientos registrados para producto 3: ${count3 || 0}`);
    if (movements3 && movements3.length > 0) {
      movements3.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason}`);
        console.log(`         Qty: ${m.quantity}, Before: ${m.quantity_before}, After: ${m.quantity_after}`);
      });
    } else {
      console.log("      ⚠️  No se registraron movimientos");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }
  console.log("");

  // PRUEBA 4: Cambiar código y ubicación (sin stock)
  console.log("🔹 PRUEBA 4: Producto 4 - Cambio de código y ubicación (sin stock)");
  const product4 = products[3];
  console.log(`   Producto: ${product4.code} - ${product4.name}`);
  console.log(`   Pasillo: ${product4.aisle || "null"}, Estante: ${product4.shelf || "null"}`);

  try {
    const updated4 = await productService.update(product4.id, {
      code: `${product4.code}-APP`,
      aisle: "A-APP",
      shelf: "E-APP"
    }, testUserId);

    console.log("   ✅ Producto 4 actualizado desde ProductService");
    console.log(`      Código: "${product4.code}" → "${updated4.code}"`);
    console.log(`      Pasillo: "${product4.aisle || "null"}" → "${updated4.aisle}"`);
    console.log(`      Estante: "${product4.shelf || "null"}" → "${updated4.shelf}"`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: movements4, count: count4 } = await supabaseAdmin
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .eq("product_id", product4.id)
      .order("movement_date", { ascending: false });

    console.log(`   📊 Movimientos registrados para producto 4: ${count4 || 0}`);
    if (movements4 && movements4.length > 0) {
      movements4.forEach((m, i) => {
        console.log(`      ${i + 1}. ${m.movement_type} - ${m.request_reason}`);
        console.log(`         Qty: ${m.quantity}, Comments: ${m.comments}`);
      });
    } else {
      console.log("      ⚠️  No se registraron movimientos");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }
  console.log("");

  // Resumen final
  const { count: finalCount } = await supabaseAdmin
    .from("inventory_movements")
    .select("*", { count: "exact", head: true });

  console.log("📊 RESUMEN FINAL:");
  console.log(`   Movimientos iniciales: ${initialCount}`);
  console.log(`   Movimientos finales: ${finalCount}`);
  console.log(`   Movimientos nuevos: ${(finalCount || 0) - (initialCount || 0)}`);
  console.log("");

  // Listar todos los movimientos registrados
  const { data: allMovements } = await supabaseAdmin
    .from("inventory_movements")
    .select("*, products(code, name)")
    .order("movement_date", { ascending: false })
    .limit(20);

  if (allMovements && allMovements.length > 0) {
    console.log("📋 TODOS LOS MOVIMIENTOS REGISTRADOS:");
    allMovements.forEach((m: any, i: number) => {
      const product = m.products;
      console.log(`   ${i + 1}. [${m.movement_date}] ${product?.code || "N/A"} - ${m.movement_type}`);
      console.log(`      ${m.request_reason}`);
      console.log(`      Qty: ${m.quantity}, Before: ${m.quantity_before}, After: ${m.quantity_after}`);
    });
  }

  if ((finalCount || 0) > (initialCount || 0)) {
    console.log("\n✅ ¡PRUEBAS EXITOSAS! Los movimientos se están registrando correctamente.");
  } else {
    console.log("\n⚠️  ADVERTENCIA: No se registraron movimientos nuevos. Verificar la lógica.");
  }
}

testMovementsFromApp().catch(console.error);

