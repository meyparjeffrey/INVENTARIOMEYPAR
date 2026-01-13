/**
 * Formatea un número como moneda en euros (€) con formato según idioma.
 * Formato ES: 1.234,56 €
 * Formato CA: 1.234,56 €
 *
 * @param amount - Cantidad a formatear
 * @param language - Idioma para formateo (es-ES o ca-ES)
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado como moneda
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  language: 'es-ES' | 'ca-ES' = 'es-ES',
  decimals: number = 2,
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '-';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '-';
  }

  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numAmount);
}
