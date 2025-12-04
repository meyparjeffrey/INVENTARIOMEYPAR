import * as XLSX from "xlsx";

/**
 * Calcula el ancho óptimo de una columna basado en su contenido.
 * Mejora: Considera caracteres especiales, números y fechas.
 */
export function calculateColumnWidth(data: any[], header: string): number {
  // Ancho mínimo y máximo
  const minWidth = 10;
  const maxWidth = 60;
  
  // Calcular ancho del header (considerando caracteres especiales)
  let maxLength = header.length;
  
  // Calcular ancho máximo del contenido
  data.forEach((value) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    
    const str = value?.toString() || "";
    
    // Para números, considerar formato con separadores de miles
    if (typeof value === "number") {
      const formatted = value.toLocaleString("es-ES", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      });
      maxLength = Math.max(maxLength, formatted.length);
    } else {
      // Para strings, considerar caracteres especiales (algunos ocupan más espacio)
      const charWidth = str.split("").reduce((acc, char) => {
        // Caracteres anchos (chinos, japoneses, etc.) cuentan como 2
        if (/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/.test(char)) {
          return acc + 2;
        }
        return acc + 1;
      }, 0);
      maxLength = Math.max(maxLength, charWidth);
    }
  });
  
  // Añadir padding (más espacio para números y fechas)
  const isNumeric = data.some((v) => typeof v === "number");
  const padding = isNumeric ? 4 : 3;
  
  const width = Math.min(Math.max(maxLength + padding, minWidth), maxWidth);
  return width;
}

/**
 * Aplica formato de moneda a una celda.
 */
export function formatCurrencyCell(value: number | string | null | undefined): {
  v: number | string;
  t: string;
  z: string;
} | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(numValue)) {
    return null;
  }
  
  return {
    v: numValue,
    t: "n",
    z: "#,##0.00 €"
  };
}

/**
 * Crea una fila de totales para Excel.
 */
export function createTotalsRow(
  data: Record<string, any>[],
  columns: string[],
  totalsConfig: Record<string, "sum" | "avg" | "count">
): Record<string, any> {
  const totals: Record<string, any> = {};
  
  columns.forEach((colKey) => {
    const config = totalsConfig[colKey];
    if (!config) {
      totals[colKey] = "";
      return;
    }
    
    const values = data.map((row) => {
      const value = row[colKey];
      return typeof value === "number" ? value : parseFloat(String(value)) || 0;
    }).filter((v) => !isNaN(v));
    
    if (values.length === 0) {
      totals[colKey] = "";
      return;
    }
    
    switch (config) {
      case "sum":
        totals[colKey] = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        totals[colKey] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        totals[colKey] = values.length;
        break;
    }
  });
  
  return totals;
}

