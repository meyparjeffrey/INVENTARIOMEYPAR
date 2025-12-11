/**
 * Script para verificar los productos importados
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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

async function verifyImport() {
    console.log("🔍 Verificando productos importados...\n");

    // Contar productos totales
    const { count: totalCount, error: countError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

    if (countError) {
        console.error("❌ Error al contar productos:", countError.message);
        return;
    }

    console.log(`📊 Total de productos activos: ${totalCount}`);

    // Obtener últimos 10 productos creados
    const { data: recentProducts, error: recentError } = await supabase
        .from("products")
        .select("code, name, stock_current, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentError) {
        console.error("❌ Error al obtener productos recientes:", recentError.message);
        return;
    }

    console.log("\n📋 Últimos 10 productos creados:");
    recentProducts?.forEach((product, index) => {
        const date = new Date(product.created_at).toLocaleString("es-ES");
        console.log(`   ${index + 1}. ${product.code} - ${product.name} (Stock: ${product.stock_current}) - ${date}`);
    });

    // Verificar algunos códigos específicos del Excel
    const testCodes = ["ELA10-30060", "ELA60-30060", "ELA60-30019"];
    console.log("\n🔍 Verificando códigos específicos del Excel:");

    for (const code of testCodes) {
        const { data, error } = await supabase
            .from("products")
            .select("code, name, stock_current")
            .eq("code", code)
            .single();

        if (error) {
            console.log(`   ❌ ${code}: No encontrado`);
        } else {
            console.log(`   ✅ ${code}: ${data.name} (Stock: ${data.stock_current})`);
        }
    }
}

verifyImport();
