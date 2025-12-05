/**
 * Script de prueba para importar productos desde Excel usando la Edge Function
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Error: Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

async function testImport() {
  console.log("🧪 Iniciando prueba de importación...\n");

  // Crear cliente Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Obtener sesión de un usuario ADMIN
  const { data: { session }, error: sessionError } = await supabase.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "password"
  });

  if (sessionError || !session) {
    console.error("❌ Error: No se pudo autenticar. Usa ADMIN_EMAIL y ADMIN_PASSWORD en .env.local");
    console.error("   O inicia sesión manualmente y copia el access_token");
    process.exit(1);
  }

  console.log("✅ Usuario ADMIN encontrado");

  // Leer archivo Excel
  const excelPath = path.join(__dirname, "Docs", "navision.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Error: No se encontró el archivo ${excelPath}`);
    process.exit(1);
  }

  console.log(`📄 Leyendo archivo: ${excelPath}`);
  const fileBuffer = fs.readFileSync(excelPath);
  const file = new File([fileBuffer], "navision.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  // Crear FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("overwriteExisting", "false"); // Solo añadir nuevos por defecto

  // Llamar a la Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/import-products-from-excel`;
  console.log(`\n🚀 Llamando a Edge Function: ${functionUrl}`);
  console.log("   Opción: Solo añadir nuevos (overwriteExisting=false)\n");

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "apikey": supabaseServiceKey
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Error en la importación:");
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log("✅ Importación completada exitosamente!\n");
    console.log("📊 Resultados:");
    console.log(`   ✅ Creados: ${result.created}`);
    console.log(`   🔄 Actualizados: ${result.updated}`);
    console.log(`   ⏭️  Omitidos: ${result.skipped}`);
    console.log(`   ❌ Errores: ${result.errors.length}`);
    console.log(`   ⚠️  Errores de validación: ${result.validationErrors.length}`);
    console.log(`   ⏱️  Duración: ${(result.duration / 1000).toFixed(2)}s\n`);

    if (result.errors.length > 0) {
      console.log("❌ Errores encontrados:");
      result.errors.slice(0, 10).forEach((err: any) => {
        console.log(`   - ${err.code}: ${err.reason}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... y ${result.errors.length - 10} más`);
      }
      console.log();
    }

    if (result.validationErrors.length > 0) {
      console.log("⚠️  Errores de validación:");
      result.validationErrors.slice(0, 10).forEach((err: any) => {
        console.log(`   - Fila ${err.row}${err.code ? ` (${err.code})` : ""}: ${err.reason}`);
      });
      if (result.validationErrors.length > 10) {
        console.log(`   ... y ${result.validationErrors.length - 10} más`);
      }
      console.log();
    }

    // Verificar productos en la BD
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("code, name, notes, stock_current, is_active")
      .order("code")
      .limit(10);

    if (!productsError && products) {
      console.log("📦 Primeros 10 productos en la BD:");
      products.forEach((p: any) => {
        console.log(`   - ${p.code}: ${p.name} (Stock: ${p.stock_current}, Activo: ${p.is_active ? "Sí" : "No"})`);
        if (p.notes) {
          console.log(`     Notas: ${p.notes}`);
        }
      });
    }

  } catch (error: any) {
    console.error("❌ Error al llamar a la Edge Function:");
    console.error(error.message);
    process.exit(1);
  }
}

testImport();

