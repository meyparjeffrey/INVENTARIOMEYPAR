/**
 * Script para analizar códigos en el Excel y encontrar caracteres invisibles
 */
import XLSX from "xlsx";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXCEL_PATH = path.join(__dirname, "..", "Docs", "navision.xlsx");

function analyzeCode(code: string): void {
  console.log("\n📋 Analizando código:", JSON.stringify(code));
  console.log("   Longitud:", code.length);
  console.log("   Caracteres:");
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const charCode = char.charCodeAt(0);
    const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
    const isVisible = charCode >= 32 && charCode <= 126;
    
    console.log(`     [${i}] '${isVisible ? char : "?"}'  U+${hex}  (${charCode})  ${isVisible ? "" : "⚠️ INVISIBLE"}`);
  }
}

function cleanCodeV1(str: string): string {
  // Versión 1: limpieza básica
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function cleanCodeV2(str: string): string {
  // Versión 2: limpieza agresiva de todos los caracteres no-ASCII excepto acentos comunes
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Control characters
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "") // Zero-width & formatting
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\u00AD/g, "") // Soft hyphen
    .replace(/\u00A0/g, " ") // Non-breaking space
    .trim();
}

function cleanCodeV3(str: string): string {
  // Versión 3: solo permitir caracteres alfanuméricos, guiones, puntos y guiones bajos
  return str.replace(/[^a-zA-Z0-9._-]/g, "");
}

async function testExcelRead() {
  try {
    console.log("🔍 Leyendo Excel:", EXCEL_PATH);
    
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log("\n📊 Sheet:", sheetName);
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length < 2) {
      console.error("❌ El Excel está vacío");
      return;
    }
    
    const headers = rawData[0].map((h: any) => String(h).trim());
    console.log("\n📝 Headers encontrados:", headers);
    
    const codeIndex = headers.findIndex((h: string) => 
      h.toUpperCase() === "CODIGO" || 
      h === "N°" || 
      h === "Nº" ||
      h.toUpperCase() === "NUMERO" || 
      h.toUpperCase() === "CODE"
    );
    
    if (codeIndex === -1) {
      console.error("❌ No se encontró columna de código");
      console.log("   Headers disponibles:", headers);
      return;
    }
    
    console.log(`✅ Columna de código encontrada en índice ${codeIndex}: "${headers[codeIndex]}"`);
    
    // Analizar primeros 5 códigos
    console.log("\n🔬 Analizando primeros 5 códigos:");
    
    for (let i = 1; i <= Math.min(5, rawData.length - 1); i++) {
      const row = rawData[i];
      const rawCode = String(row[codeIndex] || "");
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`FILA ${i + 1}:`);
      analyzeCode(rawCode);
      
      const cleanedV1 = cleanCodeV1(rawCode);
      const cleanedV2 = cleanCodeV2(rawCode);
      const cleanedV3 = cleanCodeV3(rawCode);
      
      console.log("\n   🧹 Limpieza V1 (básica):", JSON.stringify(cleanedV1));
      console.log("   🧹 Limpieza V2 (agresiva):", JSON.stringify(cleanedV2));
      console.log("   🧹 Limpieza V3 (solo alfanuméricos):", JSON.stringify(cleanedV3));
      
      const isValidV1 = /^[a-zA-Z0-9_.-]+$/.test(cleanedV1);
      const isValidV2 = /^[a-zA-Z0-9_.-]+$/.test(cleanedV2);
      const isValidV3 = /^[a-zA-Z0-9_.-]+$/.test(cleanedV3);
      
      console.log(`\n   ✓ Validación V1: ${isValidV1 ? "✅ PASA" : "❌ FALLA"}`);
      console.log(`   ✓ Validación V2: ${isValidV2 ? "✅ PASA" : "❌ FALLA"}`);
      console.log(`   ✓ Validación V3: ${isValidV3 ? "✅ PASA" : "❌ FALLA"}`);
    }
    
    console.log("\n\n✅ Análisis completado");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

testExcelRead();

