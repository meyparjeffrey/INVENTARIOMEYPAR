import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

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
  validationErrors: ValidationError[];
  duration: number;
}

function generateRandomStockValues(): { stockMin: number; stockMax: number } {
  const stockMin = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
  const stockMax = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
  return { stockMin, stockMax };
}

function generateRandomLocation(): { aisle: string; shelf: string } {
  const aisles = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E1", "E2"];
  const shelves = ["E1", "E2", "E3", "E4", "E5"];
  const aisle = aisles[Math.floor(Math.random() * aisles.length)];
  const shelf = shelves[Math.floor(Math.random() * shelves.length)];
  return { aisle, shelf };
}

function generateRandomBarcode(): string {
  return Math.random().toString(36).substring(2, 15).toUpperCase();
}

function readExcelFile(fileBuffer: ArrayBuffer): {
  products: ProductToImport[];
  errors: ValidationError[];
} {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (rawData.length < 2) {
    return { products: [], errors: [{ row: 1, reason: "El archivo Excel está vacío o no tiene datos" }] };
  }

  const headers = (rawData[0] || []).map((h: any) => String(h).trim());
  
  const codeIndex = headers.findIndex((h: string) => 
    h.toUpperCase() === "CODIGO" || 
    h.toUpperCase() === "CÓDIGO" || 
    h === "N°" || 
    h === "Nº" || 
    h.toUpperCase() === "NUMERO" || 
    h.toUpperCase() === "NÚMERO" || 
    h.toUpperCase() === "CODE" ||
    h.toUpperCase().startsWith("N°") ||
    h.toUpperCase().startsWith("Nº")
  );
  
  const nameIndex = headers.findIndex((h: string) => 
    h.toUpperCase() === "NOMBRE" || 
    h.toUpperCase() === "DESCRIPCION" || 
    h.toUpperCase() === "DESCRIPCIÓN" ||
    h.toUpperCase() === "DESCRIPTION" ||
    h.toUpperCase().includes("DESCRIPCION") ||
    h.toUpperCase().includes("DESCRIPCIÓN")
  );
  
  const supplierCodeIndex = headers.findIndex((h: string) => 
    (h.toUpperCase().includes("PROVEEDOR") && h.toUpperCase().includes("COD")) ||
    h.toUpperCase().includes("COD. PRODUCTO PROVEEDOR") ||
    h.toUpperCase().includes("CÓD. PRODUCTO PROVEEDOR") ||
    h.toUpperCase().includes("COD PRODUCTO PROVEEDOR") ||
    h.toUpperCase().includes("SUPPLIER CODE") ||
    h.toUpperCase().includes("SUPPLIERCODE")
  );

  if (codeIndex === -1 || nameIndex === -1) {
    return { 
      products: [], 
      errors: [{ 
        row: 1, 
        reason: `No se encontraron las columnas requeridas. Encontradas: ${headers.join(", ")}. Se necesita una columna de código (CODIGO, N°, etc.) y una de nombre/descripción (NOMBRE, DESCRIPCION, etc.)` 
      }] 
    };
  }

  const data = rawData.slice(1).map((row: any[]) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  const products: ProductToImport[] = [];
  const errors: ValidationError[] = [];
  const codeSet = new Set<string>();

  // Función para limpiar caracteres invisibles (zero-width, espacios no separables, etc.)
  const cleanCode = (str: string): string => {
    return str
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // Eliminar zero-width characters
      .replace(/\u00A0/g, " ") // Reemplazar espacios no separables con espacios normales
      .trim();
  };

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const code = cleanCode(String(row[headers[codeIndex]] || ""));
    const name = String(row[headers[nameIndex]] || "").trim();
    const supplierCode = supplierCodeIndex !== -1 ? String(row[headers[supplierCodeIndex]] || "").trim() : undefined;

    if (!code) {
      errors.push({ row: rowNumber, reason: "Código vacío" });
      return;
    }

    if (!name) {
      errors.push({ row: rowNumber, code, reason: "Nombre vacío" });
      return;
    }

    if (codeSet.has(code)) {
      errors.push({ row: rowNumber, code, reason: "Código duplicado en el archivo Excel" });
      return;
    }

    if (code.length < 1 || code.length > 50) {
      errors.push({
        row: rowNumber,
        code,
        reason: `Código inválido: debe tener entre 1 y 50 caracteres (tiene ${code.length})`
      });
      return;
    }

    if (name.length < 3) {
      errors.push({
        row: rowNumber,
        code,
        reason: `Nombre inválido: debe tener al menos 3 caracteres (tiene ${name.length})`
      });
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(code)) {
      errors.push({
        row: rowNumber,
        code,
        reason: "Código inválido: solo se permiten letras, números, guiones, guiones bajos y puntos"
      });
      return;
    }

    codeSet.add(code);
    products.push({ code, name, supplierCode: supplierCode || undefined });
  });

  return { products, errors };
}

async function importOrUpdateProducts(
  products: ProductToImport[],
  adminUserId: string,
  supabase: ReturnType<typeof createClient>,
  overwriteExisting: boolean = true
): Promise<Omit<ImportResult, "validationErrors" | "duration">> {
  const result: Omit<ImportResult, "validationErrors" | "duration"> = {
    created: 0,
    updated: 0,
    errors: [],
    skipped: 0
  };

  // OPTIMIZACIÓN: Procesar en lotes más grandes y reducir consultas
  const batchSize = 50; // Reducido de 100 a 50 para evitar timeouts

  // Si se elige "Sobrescribir todos", primero eliminar productos que NO están en el Excel
  if (overwriteExisting) {
    const excelCodes = new Set(products.map(p => p.code));
    const { data: allProducts, error: fetchAllError } = await supabase
      .from("products")
      .select("id, code")
      .eq("is_active", true);
    
    if (!fetchAllError && allProducts) {
      const productsToDelete = allProducts.filter(p => !excelCodes.has(p.code));
      
      if (productsToDelete.length > 0) {
        // Eliminar en lotes
        for (let i = 0; i < productsToDelete.length; i += batchSize) {
          const batch = productsToDelete.slice(i, i + batchSize);
          const ids = batch.map(p => p.id);
          
          await supabase
            .from("products")
            .delete()
            .in("id", ids);
        }
      }
    }
  }

  // OPTIMIZACIÓN: Obtener todos los productos existentes en una sola consulta
  // Dividir en chunks de 100 códigos para evitar URLs demasiado largas
  const chunkSize = 100;
  const existingProducts: Array<{ id: string; code: string }> = [];
  
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const chunkCodes = chunk.map(p => p.code);
    
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, code")
      .in("code", chunkCodes);
    
    if (fetchError) {
      result.errors.push({
        code: "BATCH",
        reason: `Error al verificar productos existentes (chunk ${Math.floor(i / chunkSize) + 1}): ${fetchError.message}`
      });
      return result;
    }
    
    if (data) {
      existingProducts.push(...data);
    }
  }

  // Crear un mapa de códigos a IDs para acceso rápido
  const existingMap = new Map<string, string>();
  (existingProducts || []).forEach(p => {
    existingMap.set(p.code, p.id);
  });

  // Separar productos en nuevos y existentes
  const productsToCreate: ProductToImport[] = [];
  const productsToUpdate: Array<{ product: ProductToImport; id: string }> = [];
  const productsToSkip: ProductToImport[] = [];

  products.forEach(product => {
    const existingId = existingMap.get(product.code);
    if (existingId) {
      if (overwriteExisting) {
        productsToUpdate.push({ product, id: existingId });
      } else {
        productsToSkip.push(product);
      }
    } else {
      productsToCreate.push(product);
    }
  });

  result.skipped = productsToSkip.length;

  // OPTIMIZACIÓN: Actualizar productos existentes en lotes
  if (productsToUpdate.length > 0) {
    for (let i = 0; i < productsToUpdate.length; i += batchSize) {
      const batch = productsToUpdate.slice(i, i + batchSize);
      
      // Actualizar en lote usando Promise.all para paralelizar
      const updatePromises = batch.map(({ product, id }) =>
        supabase
          .from("products")
          .update({
            name: product.name,
            notes: product.supplierCode ? `Código proveedor: ${product.supplierCode}` : null,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
      );

      const updateResults = await Promise.all(updatePromises);
      
      updateResults.forEach((result, index) => {
        if (result.error) {
          result.errors.push({
            code: batch[index].product.code,
            reason: `Error al actualizar: ${result.error.message}`
          });
        } else {
          result.updated++;
        }
      });
    }
  }

  // OPTIMIZACIÓN: Crear productos nuevos en lotes grandes
  if (productsToCreate.length > 0) {
    for (let i = 0; i < productsToCreate.length; i += batchSize) {
      const batch = productsToCreate.slice(i, i + batchSize);
      
      // Preparar datos para inserción en lote
      const insertData = batch.map(product => {
        const { stockMin, stockMax } = generateRandomStockValues();
        const { aisle, shelf } = generateRandomLocation();
        const barcode = generateRandomBarcode();

        return {
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
        };
      });

      const { error: insertError } = await supabase
        .from("products")
        .insert(insertData);

      if (insertError) {
        // Si falla el lote completo, intentar uno por uno para identificar el problema
        for (const product of batch) {
          const { stockMin, stockMax } = generateRandomStockValues();
          const { aisle, shelf } = generateRandomLocation();
          const barcode = generateRandomBarcode();

          const { error: singleError } = await supabase
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

          if (singleError) {
            result.errors.push({
              code: product.code,
              reason: `Error al crear: ${singleError.message}`
            });
          } else {
            result.created++;
          }
        }
      } else {
        result.created += batch.length;
      }
    }
  }

  return result;
}

async function getAdminUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No se encontró un usuario ADMIN. Error: ${error?.message || "Sin datos"}`);
  }

  return data.id;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método no permitido. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No se proporcionó token de autorización" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Solo usuarios ADMIN pueden importar productos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const overwriteExisting = formData.get("overwriteExisting") === "true";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No se proporcionó archivo Excel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return new Response(
        JSON.stringify({ error: "El archivo debe ser un Excel (.xlsx o .xls)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "El archivo es demasiado grande (máximo 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    const fileBuffer = await file.arrayBuffer();
    const { products, errors: validationErrors } = readExcelFile(fileBuffer);

    if (products.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No hay productos válidos para importar",
          validationErrors
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserId = await getAdminUserId(supabaseAdmin);
    const importResult = await importOrUpdateProducts(products, adminUserId, supabaseAdmin, overwriteExisting);
    const duration = ((Date.now() - startTime) / 1000);

    const result: ImportResult = {
      ...importResult,
      validationErrors,
      duration
    };

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en importación:", error);
    return new Response(
      JSON.stringify({
        error: "Error durante la importación",
        message: error?.message || String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
