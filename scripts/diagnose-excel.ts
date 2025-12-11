/**
 * Script de diagnóstico para ver la estructura del Excel
 */

import XLSX from "xlsx";
import * as path from "path";

const __dirname = path.resolve();
const excelPath = path.join(__dirname, "Docs", "Libro1.xlsx");

console.log(`📖 Analizando: ${excelPath}\n`);

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log(`📄 Hoja: ${sheetName}\n`);

// Convertir a JSON
const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

console.log(`📊 Total de filas: ${data.length}\n`);

if (data.length > 0) {
    console.log("🔍 Columnas encontradas:");
    const firstRow = data[0] as any;
    Object.keys(firstRow).forEach((key, index) => {
        console.log(`   ${index + 1}. "${key}" = "${firstRow[key]}"`);
    });

    console.log("\n📋 Primeras 5 filas:");
    data.slice(0, 5).forEach((row: any, index) => {
        console.log(`\nFila ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
    });
}
