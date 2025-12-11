/**
 * Script para importar productos desde Libro1.xlsx a Supabase.
 * 
 * Formato del Excel:
 *   - Columna 1: CODIGO
 *   - Columna 2: STOCK ACTUAL
 *   - Columna 3: NOMBRE
 * 
 * Uso:
 *   npx ts-node --project tsconfig.node.json scripts/import-libro1.ts
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
    CODI?: string;
    UNITATS?: number;
    "DESCRIPCIÓ"?: string;
    // Alternativas en minúsculas
    codi?: string;
    unitats?: number;
    descripció?: string;
    descripcio?: string;
}

interface ProductToImport {
    code: string;
    name: string;
    stockCurrent: number;
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
 * Lee el archivo Excel y extrae los productos.
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

        // Extraer valores con múltiples variantes de nombres de columnas
        const code = String(
            row.CODI || row.codi || (row as any)["CODI"] || (row as any)["codi"] || ""
        ).trim();

        const name = String(
            row["DESCRIPCIÓ"] || row.descripció || row.descripcio || (row as any)["DESCRIPCIÓ"] || (row as any)["descripció"] || ""
        ).trim();

        const stockValue =
            row.UNITATS ||
            row.unitats ||
            (row as any)["UNITATS"] ||
            (row as any)["unitats"];

        const stockCurrent = stockValue !== undefined && stockValue !== null
            ? Number(stockValue)
            : 0;

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

        // Validación: formato de código
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

        // Validación: stock debe ser un número válido
        if (isNaN(stockCurrent) || stockCurrent < 0) {
            errors.push({
                row: rowNumber,
                code,
                reason: `Stock inválido: debe ser un número positivo (valor: ${stockValue})`
            });
            return;
        }

        codeSet.add(code);
        products.push({
            code,
            name,
            stockCurrent
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
 * Importa productos a Supabase.
 */
async function importProducts(
    products: ProductToImport[],
    adminUserId: string
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
    const createdAt = new Date().toISOString();

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
                    .select("id, stock_current")
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
                    // Producto existe - actualizar nombre y stock
                    const { error: updateError } = await supabase
                        .from("products")
                        .update({
                            name: product.name,
                            stock_current: product.stockCurrent,
                            is_active: true,
                            updated_at: new Date().toISOString()
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
                    // Producto no existe - crear nuevo
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
                            stock_current: product.stockCurrent,
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
                            notes: null,
                            created_by: adminUserId,
                            created_at: createdAt,
                            updated_at: createdAt
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
    const excelPath = path.join(__dirname, "Docs", "Libro1.xlsx");

    const startTime = Date.now();

    try {
        // 1. Leer Excel
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

        // 3. Importar productos
        console.log("\n" + "=".repeat(60));
        console.log("📦 PASO 3: Importando productos a Supabase");
        console.log("=".repeat(60));
        const result = await importProducts(products, adminUserId);

        // 4. Resumen final
        console.log("\n" + "=".repeat(60));
        console.log("📊 RESUMEN FINAL");
        console.log("=".repeat(60));
        console.log(`✅ Productos creados: ${result.created}`);
        console.log(`🔄 Productos actualizados: ${result.updated}`);
        console.log(`❌ Errores: ${result.errors.length}`);
        console.log(`⚠️  Omitidos (validación): ${validationErrors.length}`);

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
