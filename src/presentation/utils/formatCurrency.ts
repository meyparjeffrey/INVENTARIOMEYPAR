/**
 * Formatea un número como moneda en euros (€) con formato español.
 * Formato: 1.234,56 €
 * 
 * @param amount - Cantidad a formatear
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado como moneda
 */
export function formatCurrency(amount: number | string | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined || amount === "") {
    return "-";
  }

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numAmount);
}

