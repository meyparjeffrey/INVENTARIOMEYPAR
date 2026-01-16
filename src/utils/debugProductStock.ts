/**
 * Utilidad de depuración para verificar el stock de un producto
 *
 * Uso desde la consola del navegador:
 *
 * 1. Abrir la aplicación en el navegador
 * 2. Abrir DevTools (F12) -> Consola
 * 3. Importar y usar:
 *
 *    import { debugProductStock } from './utils/debugProductStock';
 *    await debugProductStock('AAAA QRTEST-USB-1');
 *
 * O desde la consola del navegador (si está disponible globalmente):
 *
 *    window.debugProductStock('AAAA QRTEST-USB-1');
 */

import type { Product } from '@domain/entities/Product';

/**
 * Calcula el stock por almacén usando la misma lógica que handleExportExcel
 */
function calculateStockByWarehouse(
  product: Product,
  warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
): number {
  // Calcular stock en almacén desde locations
  if (
    product.locations &&
    Array.isArray(product.locations) &&
    product.locations.length > 0
  ) {
    return product.locations
      .filter((loc) => loc.warehouse === warehouse)
      .reduce((sum, loc) => sum + (loc.quantity || 0), 0);
  }
  // Fallback: si el producto tiene warehouse pero no locations
  return product.warehouse === warehouse ? product.stockCurrent : 0;
}

/**
 * Analiza el stock de un producto y muestra información detallada
 */
export async function debugProductStock(productCode: string): Promise<any> {
  // Importar dinámicamente para evitar problemas de dependencias circulares
  const { SupabaseProductRepository } =
    await import('@infrastructure/repositories/SupabaseProductRepository');

  const repository = new SupabaseProductRepository();

  console.log(`\n🔍 Buscando producto: ${productCode}...\n`);

  try {
    const product = await repository.findByCodeOrBarcode(productCode);

    if (!product) {
      console.log(`❌ Producto no encontrado: ${productCode}`);
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 ANÁLISIS DE STOCK DEL PRODUCTO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Código: ${product.code}`);
    console.log(`Nombre: ${product.name}`);
    console.log(`\n📊 STOCK ACTUAL (stockCurrent): ${product.stockCurrent}`);

    // Calcular stock por almacén
    const stockMEYPAR = calculateStockByWarehouse(product, 'MEYPAR');
    const stockOLIVA_TORRAS = calculateStockByWarehouse(product, 'OLIVA_TORRAS');
    const stockFURGONETA = calculateStockByWarehouse(product, 'FURGONETA');

    console.log(`\n📦 STOCK POR ALMACÉN (calculado desde locations):`);
    console.log(`  - MEYPAR: ${stockMEYPAR}`);
    console.log(`  - OLIVA TORRAS: ${stockOLIVA_TORRAS}`);
    console.log(`  - FURGONETA: ${stockFURGONETA}`);

    // Suma de stocks por almacén
    const sumaAlmacenes = stockMEYPAR + stockOLIVA_TORRAS + stockFURGONETA;
    console.log(`\n➕ SUMA DE ALMACENES: ${sumaAlmacenes}`);
    console.log(`📊 STOCK ACTUAL (stockCurrent): ${product.stockCurrent}`);

    // Verificar coincidencia
    console.log('\n═══════════════════════════════════════════════════════════');
    if (sumaAlmacenes === product.stockCurrent) {
      console.log('✅ COINCIDENCIA: La suma de almacenes coincide con el stock actual');
    } else {
      console.log(
        `⚠️  DISCREPANCIA: La suma (${sumaAlmacenes}) NO coincide con stock actual (${product.stockCurrent})`,
      );
      console.log(`   Diferencia: ${Math.abs(sumaAlmacenes - product.stockCurrent)}`);

      if (sumaAlmacenes < product.stockCurrent) {
        console.log(`   ⚠️  El stock actual es MAYOR que la suma de almacenes`);
        console.log(`   💡 Posibles causas:`);
        console.log(`      - Hay stock en almacenes no contabilizados`);
        console.log(`      - El stock actual no se ha actualizado desde locations`);
        console.log(`      - Hay ubicaciones sin warehouse definido`);
      } else {
        console.log(`   ⚠️  La suma de almacenes es MAYOR que el stock actual`);
        console.log(`   💡 Posibles causas:`);
        console.log(`      - El stock actual está desactualizado`);
        console.log(`      - Hay ubicaciones duplicadas o incorrectas`);
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Mostrar locations si existen
    if (
      product.locations &&
      Array.isArray(product.locations) &&
      product.locations.length > 0
    ) {
      console.log('📍 UBICACIONES DEL PRODUCTO:');
      product.locations.forEach((loc, index) => {
        console.log(
          `  ${index + 1}. ${loc.warehouse} - ${loc.aisle}${loc.shelf} - Cantidad: ${loc.quantity || 0}`,
        );
      });
      console.log('');
    } else {
      console.log('⚠️  El producto NO tiene locations definidas');
      if (product.warehouse) {
        console.log(`   Almacén primario: ${product.warehouse}`);
        console.log(`   Stock se calculará usando fallback (warehouse + stockCurrent)`);
      }
      console.log('');
    }

    // Mostrar lo que se exportaría en Excel
    console.log('📄 DATOS QUE SE EXPORTARÍAN EN EXCEL:');
    console.log('   Columnas de stock:');
    console.log(`     - Stock MEYPAR: ${stockMEYPAR}`);
    console.log(`     - Stock OLIVA TORRAS: ${stockOLIVA_TORRAS}`);
    console.log(`     - Stock FURGONETA: ${stockFURGONETA}`);
    console.log(`     - Stock Total: ${product.stockCurrent}`);
    console.log('');

    // Verificar stocksByWarehouse si existe
    if (
      product.stocksByWarehouse &&
      Array.isArray(product.stocksByWarehouse) &&
      product.stocksByWarehouse.length > 0
    ) {
      console.log('📊 STOCKS BY WAREHOUSE (tabla product_stock_by_warehouse):');
      product.stocksByWarehouse.forEach((stock) => {
        console.log(`  - ${stock.warehouse}: ${stock.quantity}`);
      });
      console.log('');
    }

    // Retornar objeto con los datos para uso programático
    return {
      product,
      stockMEYPAR,
      stockOLIVA_TORRAS,
      stockFURGONETA,
      stockTotal: product.stockCurrent,
      sumaAlmacenes,
      coincide: sumaAlmacenes === product.stockCurrent,
    };
  } catch (error: unknown) {
    console.error('❌ Error al buscar producto:', error);
    throw error;
  }
}

/**
 * Hace disponible la función globalmente en window para uso desde la consola
 */
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).debugProductStock = debugProductStock;
}
