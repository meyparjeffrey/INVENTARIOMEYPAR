import * as XLSX from "xlsx";

/**
 * Calcula el ancho óptimo de una columna basado en su contenido.
 */
export function calculateColumnWidth(data: any[], header: string): number {
  // Ancho mínimo y máximo
  const minWidth = 8;
  const maxWidth = 50;
  
  // Calcular ancho del header
  let maxLength = header.length;
  
  // Calcular ancho máximo del contenido
  data.forEach((value) => {
    const str = value?.toString() || "";
    if (str.length > maxLength) {
      maxLength = str.length;
    }
  });
  
  // Añadir padding
  const width = Math.min(Math.max(maxLength + 2, minWidth), maxWidth);
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

