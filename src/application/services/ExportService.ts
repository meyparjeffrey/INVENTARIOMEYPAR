import * as XLSX from 'xlsx';
import type { Product } from '@domain/entities/Product';
import type { ProductBatch } from '@domain/entities/Product';
import type { InventoryMovement } from '@domain/entities/InventoryMovement';

/**
 * Configuración de exportación
 */
export interface ExportConfig {
  fileName: string;
  sheetName?: string;
  columns: string[];
  format: 'xlsx' | 'csv' | 'pdf';
  includeFilters?: boolean;
  filtersSummary?: Record<string, string>;
  language?: 'es-ES' | 'ca-ES';
}

/**
 * Mapeo de traducciones para columnas
 */
const COLUMN_TRANSLATIONS = {
  'es-ES': {
    // Productos
    code: 'Código',
    name: 'Nombre',
    description: 'Descripción',
    category: 'Categoría',
    barcode: 'Código de Barras',
    stockCurrent: 'Stock Actual',
    stockMin: 'Stock Mínimo',
    stockMax: 'Stock Máximo',
    unit: 'Unidad',
    location: 'Ubicación',
    costPrice: 'Precio Coste',
    salePrice: 'Precio Venta',
    supplierCode: 'Código Proveedor',
    isActive: 'Activo',
    isBatchTracked: 'Seguimiento por Lotes',
    createdAt: 'Fecha Creación',
    updatedAt: 'Última Actualización',
    // Lotes
    batchNumber: 'Número de Lote',
    expirationDate: 'Fecha Caducidad',
    manufacturingDate: 'Fecha Fabricación',
    quantity: 'Cantidad',
    status: 'Estado',
    productName: 'Producto',
    // Movimientos
    movementType: 'Tipo Movimiento',
    movementDate: 'Fecha Movimiento',
    quantityBefore: 'Cantidad Antes',
    quantityAfter: 'Cantidad Después',
    requestReason: 'Motivo',
    reasonCategory: 'Categoría Motivo',
    referenceDocument: 'Documento Referencia',
    comments: 'Comentarios',
    userName: 'Usuario',
  },
  'ca-ES': {
    // Productes
    code: 'Codi',
    name: 'Nom',
    description: 'Descripció',
    category: 'Categoria',
    barcode: 'Codi de Barres',
    stockCurrent: 'Estoc Actual',
    stockMin: 'Estoc Mínim',
    stockMax: 'Estoc Màxim',
    unit: 'Unitat',
    location: 'Ubicació',
    costPrice: 'Preu Cost',
    salePrice: 'Preu Venda',
    supplierCode: 'Codi Proveïdor',
    isActive: 'Actiu',
    isBatchTracked: 'Seguiment per Lots',
    createdAt: 'Data Creació',
    updatedAt: 'Última Actualització',
    // Lots
    batchNumber: 'Número de Lot',
    expirationDate: 'Data Caducitat',
    manufacturingDate: 'Data Fabricació',
    quantity: 'Quantitat',
    status: 'Estat',
    productName: 'Producte',
    // Moviments
    movementType: 'Tipus Moviment',
    movementDate: 'Data Moviment',
    quantityBefore: 'Quantitat Abans',
    quantityAfter: 'Quantitat Després',
    requestReason: 'Motiu',
    reasonCategory: 'Categoria Motiu',
    referenceDocument: 'Document Referència',
    comments: 'Comentaris',
    userName: 'Usuari',
  },
};

/**
 * Traducciones de valores de estado
 */
const STATUS_TRANSLATIONS = {
  'es-ES': {
    OK: 'OK',
    DEFECTIVE: 'Defectuoso',
    BLOCKED: 'Bloqueado',
    CONSUMED: 'Consumido',
    EXPIRED: 'Caducado',
    IN: 'Entrada',
    OUT: 'Salida',
    ADJUSTMENT: 'Ajuste',
    TRANSFER: 'Transferencia',
    true: 'Sí',
    false: 'No',
  },
  'ca-ES': {
    OK: 'OK',
    DEFECTIVE: 'Defectuós',
    BLOCKED: 'Bloquejat',
    CONSUMED: 'Consumit',
    EXPIRED: 'Caducat',
    IN: 'Entrada',
    OUT: 'Sortida',
    ADJUSTMENT: 'Ajust',
    TRANSFER: 'Transferència',
    true: 'Sí',
    false: 'No',
  },
};

/**
 * Servicio de exportación a Excel/CSV/PDF
 */
export class ExportService {
  /**
   * Exporta productos a Excel/CSV
   */
  static exportProducts(products: Product[], config: ExportConfig): void {
    const lang = config.language || 'es-ES';
    const translations = COLUMN_TRANSLATIONS[lang];
    const statusTrans = STATUS_TRANSLATIONS[lang];

    // Crear datos para exportar
    const exportData = products.map((product) => {
      const row: Record<string, unknown> = {};

      config.columns.forEach((col) => {
        const header = translations[col as keyof typeof translations] || col;
        let value = product[col as keyof Product];

        // Formatear valores especiales
        if (col === 'isActive' || col === 'isBatchTracked') {
          value = statusTrans[String(value) as keyof typeof statusTrans] || value;
        } else if (col === 'createdAt' || col === 'updatedAt') {
          value = value ? new Date(value as string).toLocaleDateString(lang) : '';
        } else if (col === 'costPrice' || col === 'salePrice') {
          value = typeof value === 'number' ? `${value.toFixed(2)} €` : '';
        }

        row[header] = value ?? '';
      });

      return row;
    });

    // Crear hoja de resumen de filtros si aplica
    const sheets: { name: string; data: Record<string, unknown>[] }[] = [];

    if (config.includeFilters && config.filtersSummary) {
      const filterData = Object.entries(config.filtersSummary).map(([key, value]) => ({
        [translations.name || 'Filtro']: key,
        [translations.description || 'Valor']: value,
      }));
      sheets.push({
        name: lang === 'ca-ES' ? 'Filtres Aplicats' : 'Filtros Aplicados',
        data: filterData,
      });
    }

    sheets.push({
      name: config.sheetName || (lang === 'ca-ES' ? 'Productes' : 'Productos'),
      data: exportData,
    });

    ExportService.generateExcel(sheets, config);
  }

  /**
   * Exporta lotes a Excel/CSV
   */
  static exportBatches(
    batches: (ProductBatch & { productName?: string })[],
    config: ExportConfig,
  ): void {
    const lang = config.language || 'es-ES';
    const translations = COLUMN_TRANSLATIONS[lang];
    const statusTrans = STATUS_TRANSLATIONS[lang];

    const exportData = batches.map((batch) => {
      const row: Record<string, unknown> = {};

      config.columns.forEach((col) => {
        const header = translations[col as keyof typeof translations] || col;
        let value = batch[col as keyof typeof batch];

        // Formatear valores especiales
        if (col === 'status') {
          value = statusTrans[value as keyof typeof statusTrans] || value;
        } else if (
          col === 'expirationDate' ||
          col === 'manufacturingDate' ||
          col === 'createdAt'
        ) {
          value = value ? new Date(value as string).toLocaleDateString(lang) : '';
        }

        row[header] = value ?? '';
      });

      return row;
    });

    const sheets: { name: string; data: Record<string, unknown>[] }[] = [];

    if (config.includeFilters && config.filtersSummary) {
      const filterData = Object.entries(config.filtersSummary).map(([key, value]) => ({
        [lang === 'ca-ES' ? 'Filtre' : 'Filtro']: key,
        [lang === 'ca-ES' ? 'Valor' : 'Valor']: value,
      }));
      sheets.push({
        name: lang === 'ca-ES' ? 'Filtres Aplicats' : 'Filtros Aplicados',
        data: filterData,
      });
    }

    sheets.push({
      name: config.sheetName || (lang === 'ca-ES' ? 'Lots' : 'Lotes'),
      data: exportData,
    });

    ExportService.generateExcel(sheets, config);
  }

  /**
   * Exporta movimientos a Excel/CSV
   */
  static exportMovements(
    movements: (InventoryMovement & { productName?: string; userName?: string })[],
    config: ExportConfig,
  ): void {
    const lang = config.language || 'es-ES';
    const translations = COLUMN_TRANSLATIONS[lang];
    const statusTrans = STATUS_TRANSLATIONS[lang];

    const exportData = movements.map((movement) => {
      const row: Record<string, unknown> = {};

      config.columns.forEach((col) => {
        const header = translations[col as keyof typeof translations] || col;
        let value = movement[col as keyof typeof movement];

        // Formatear valores especiales
        if (col === 'movementType') {
          value = statusTrans[value as keyof typeof statusTrans] || value;
        } else if (col === 'movementDate' || col === 'createdAt') {
          value = value ? new Date(value as string).toLocaleString(lang) : '';
        }

        row[header] = value ?? '';
      });

      return row;
    });

    const sheets: { name: string; data: Record<string, unknown>[] }[] = [];

    if (config.includeFilters && config.filtersSummary) {
      const filterData = Object.entries(config.filtersSummary).map(([key, value]) => ({
        [lang === 'ca-ES' ? 'Filtre' : 'Filtro']: key,
        [lang === 'ca-ES' ? 'Valor' : 'Valor']: value,
      }));
      sheets.push({
        name: lang === 'ca-ES' ? 'Filtres Aplicats' : 'Filtros Aplicados',
        data: filterData,
      });
    }

    sheets.push({
      name: config.sheetName || (lang === 'ca-ES' ? 'Moviments' : 'Movimientos'),
      data: exportData,
    });

    ExportService.generateExcel(sheets, config);
  }

  /**
   * Genera y descarga el archivo Excel/CSV
   */
  private static generateExcel(
    sheets: { name: string; data: Record<string, unknown>[] }[],
    config: ExportConfig,
  ): void {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);

      // Aplicar estilos básicos (ancho de columnas)
      const maxWidths: number[] = [];
      sheet.data.forEach((row) => {
        Object.values(row).forEach((val, idx) => {
          const length = String(val ?? '').length;
          maxWidths[idx] = Math.max(maxWidths[idx] || 10, length);
        });
      });

      worksheet['!cols'] = maxWidths.map((w) => ({ wch: Math.min(w + 2, 50) }));

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });

    // Generar archivo
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${config.fileName}_${timestamp}`;

    if (config.format === 'csv') {
      // Exportar solo la primera hoja como CSV
      const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[sheets[0].name]);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      ExportService.downloadBlob(blob, `${fileName}.csv`);
    } else {
      // Exportar como XLSX
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      ExportService.downloadBlob(blob, `${fileName}.xlsx`);
    }
  }

  /**
   * Descarga un blob como archivo
   */
  private static downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Genera un PDF con los datos (usa jspdf)
   * Nota: Requiere instalación de jspdf y jspdf-autotable
   */
  static async exportToPDF(
    title: string,
    headers: string[],
    rows: string[][],
    config: Partial<ExportConfig>,
  ): Promise<void> {
    // Importación dinámica de jspdf para evitar problemas de carga inicial
    try {
      const jsPDFModule = await import('jspdf');
      // jsPDF puede exportarse de diferentes formas según la versión
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsPDFClass =
        jsPDFModule.jsPDF ||
        (jsPDFModule as any).default?.jsPDF ||
        (jsPDFModule as any).default;

      const autoTableModule = await import('jspdf-autotable');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const autoTable = autoTableModule.default || (autoTableModule as any);

      const doc = new jsPDFClass({
        orientation: rows[0]?.length > 5 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Título
      doc.setFontSize(16);
      doc.text(title, 14, 20);

      // Fecha
      const lang = config.language || 'es-ES';
      doc.setFontSize(10);
      doc.text(
        `${lang === 'ca-ES' ? 'Data' : 'Fecha'}: ${new Date().toLocaleDateString(lang)}`,
        14,
        28,
      );

      // Filtros aplicados
      let startY = 35;
      if (config.includeFilters && config.filtersSummary) {
        doc.setFontSize(11);
        doc.text(
          lang === 'ca-ES' ? 'Filtres aplicats:' : 'Filtros aplicados:',
          14,
          startY,
        );
        startY += 5;
        doc.setFontSize(9);
        Object.entries(config.filtersSummary).forEach(([key, value]) => {
          doc.text(`• ${key}: ${value}`, 18, startY);
          startY += 4;
        });
        startY += 5;
      }

      // Tabla de datos
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      });

      // Pie de página
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `${lang === 'ca-ES' ? 'Pàgina' : 'Página'} ${i} ${lang === 'ca-ES' ? 'de' : 'de'} ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10,
        );
      }

      // Descargar
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`${config.fileName || 'export'}_${timestamp}.pdf`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al generar PDF:', error);
      throw new Error(
        'No se pudo generar el PDF. Asegúrate de que jspdf y jspdf-autotable estén instalados.',
      );
    }
  }

  /**
   * Exporta un informe de inventario.
   *
   * @param report - Informe de inventario
   * @param config - Configuración de exportación
   */
  static async exportInventoryReport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: any,
    config: ExportConfig,
  ): Promise<void> {
    const lang = config.language || 'es-ES';
    const translations = COLUMN_TRANSLATIONS[lang];

    // Validar que el informe tenga items
    if (!report || !report.items || !Array.isArray(report.items)) {
      // eslint-disable-next-line no-console
      console.error('Informe inválido: no tiene items');
      return;
    }

    // Crear datos para exportar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportData = report.items.map((item: any) => {
      const product = item.product || {};
      const valueAtCost = item.valueAtCost ?? 0;
      const valueAtSale = item.valueAtSale ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productAny = product as any; // Para acceder a propiedades que pueden no estar tipadas

      return {
        [translations.code]: product.code || '',
        [translations.name]: product.name || '',
        [translations.stockCurrent]: item.currentStock ?? 0,
        [translations.stockMin]: item.stockMin ?? 0,
        [translations.stockMax]: item.stockMax ?? '',
        [translations.aisle]: productAny.aisle || '',
        [translations.shelf]: productAny.shelf || '',
        [translations.location]: item.location || '',
        [translations.category]: product.category ?? '',
        [translations.costPrice]: `${(product.costPrice ?? 0).toFixed(2)} €`,
        [translations.salePrice]: product.salePrice
          ? `${product.salePrice.toFixed(2)} €`
          : '',
        'Valor a Coste': `${valueAtCost.toFixed(2)} €`,
        'Valor a Venta': `${valueAtSale.toFixed(2)} €`,
        'Stock Bajo': item.isLowStock ? 'Sí' : 'No',
      };
    });

    // Validar que el informe tenga summary
    const summary = report.summary || {};
    const totalValueAtCost = summary.totalValueAtCost ?? 0;
    const totalValueAtSale = summary.totalValueAtSale ?? 0;

    const sheets = [
      {
        name: lang === 'ca-ES' ? 'Resum' : 'Resumen',
        data: [
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Total Productes' : 'Total Productos',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.totalProducts ?? 0,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Valor Total a Coste' : 'Valor Total a Coste',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${totalValueAtCost.toFixed(2)} €`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Valor Total a Venta' : 'Valor Total a Venta',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${totalValueAtSale.toFixed(2)} €`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Total Unitats' : 'Total Unidades',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.totalUnits ?? 0,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Productes en Alarma' : 'Productos en Alarma',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.lowStockCount ?? 0,
          },
        ],
      },
      {
        name: lang === 'ca-ES' ? 'Productes' : 'Productos',
        data: exportData,
      },
    ];

    // Verificar si el formato es PDF
    if (config.format === 'pdf') {
      // Convertir datos para PDF
      if (exportData.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((item: Record<string, unknown>) =>
        headers.map((header: string) => String(item[header] || '')),
      );

      // Añadir resumen al título
      const summaryText =
        lang === 'ca-ES'
          ? `Total: ${summary.totalProducts ?? 0} productes | Valor: ${totalValueAtCost.toFixed(2)} €`
          : `Total: ${summary.totalProducts ?? 0} productos | Valor: ${totalValueAtCost.toFixed(2)} €`;

      const title = lang === 'ca-ES' ? "Informe d'Inventari" : 'Informe de Inventario';

      await ExportService.exportToPDF(`${title}\n${summaryText}`, headers, rows, config);
    } else {
      ExportService.generateExcel(sheets, config);
    }
  }

  /**
   * Exporta un informe de movimientos.
   *
   * @param report - Informe de movimientos
   * @param config - Configuración de exportación
   */
  static async exportMovementsReport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: any,
    config: ExportConfig,
  ): Promise<void> {
    const lang = config.language || 'es-ES';

    // Validar que el informe tenga items
    if (!report || !report.items || !Array.isArray(report.items)) {
      // eslint-disable-next-line no-console
      console.error('Informe inválido: no tiene items');
      return;
    }

    // Crear datos para exportar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportData = report.items.map((item: any) => {
      return {
        Fecha: item.movementDate
          ? new Date(item.movementDate).toLocaleDateString(lang)
          : '',
        Tipo: item.movementType || '',
        'Código Producto': item.productCode || '',
        'Nombre Producto': item.productName || '',
        Cantidad: item.quantity ?? 0,
        'Stock Antes': item.quantityBefore ?? 0,
        'Stock Después': item.quantityAfter ?? 0,
        Motivo: item.requestReason || '',
        Categoría: item.reasonCategory ?? '',
        Usuario: item.userName ?? '',
        Comentarios: item.comments ?? '',
      };
    });

    // Validar que el informe tenga summary
    const summary = report.summary || {};

    const sheets = [
      {
        name: lang === 'ca-ES' ? 'Resum' : 'Resumen',
        data: [
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Total Moviments' : 'Total Movimientos',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.totalMovements ?? 0,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Entrades' : 'Entradas',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']:
              `${summary.totalEntries ?? 0} (${summary.entriesQuantity ?? 0} uds)`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Sortides' : 'Salidas',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']:
              `${summary.totalExits ?? 0} (${summary.exitsQuantity ?? 0} uds)`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Ajustos' : 'Ajustes',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.totalAdjustments ?? 0,
          },
        ],
      },
      {
        name: lang === 'ca-ES' ? 'Moviments' : 'Movimientos',
        data: exportData,
      },
    ];

    // Verificar si el formato es PDF
    if (config.format === 'pdf') {
      // Convertir datos para PDF
      if (exportData.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((item: Record<string, unknown>) =>
        headers.map((header: string) => String(item[header] || '')),
      );

      // Añadir resumen al título
      const summaryText =
        lang === 'ca-ES'
          ? `Total: ${summary.totalMovements ?? 0} moviments | Entrades: ${summary.totalEntries ?? 0} | Sortides: ${summary.totalExits ?? 0}`
          : `Total: ${summary.totalMovements ?? 0} movimientos | Entradas: ${summary.totalEntries ?? 0} | Salidas: ${summary.totalExits ?? 0}`;

      const title = lang === 'ca-ES' ? 'Informe de Moviments' : 'Informe de Movimientos';

      // Llamar a exportToPDF de forma asíncrona
      ExportService.exportToPDF(`${title}\n${summaryText}`, headers, rows, config).catch(
        (error) => {
          // eslint-disable-next-line no-console
          console.error('Error al exportar PDF:', error);
        },
      );
    } else {
      ExportService.generateExcel(sheets, config);
    }
  }

  /**
   * Exporta un análisis ABC.
   *
   * @param report - Informe ABC
   * @param config - Configuración de exportación
   */
  static async exportABCReport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: any,
    config: ExportConfig,
  ): Promise<void> {
    const lang = config.language || 'es-ES';
    const translations = COLUMN_TRANSLATIONS[lang];

    // Validar que el informe tenga classifications
    if (!report || !report.classifications || !Array.isArray(report.classifications)) {
      // eslint-disable-next-line no-console
      console.error('Informe inválido: no tiene classifications');
      return;
    }

    // Crear datos para exportar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportData = report.classifications.map((item: any) => {
      const product = item.product || {};
      const value = item.value ?? 0;
      const percentage = item.percentage ?? 0;
      const cumulativePercentage = item.cumulativePercentage ?? 0;

      return {
        Categoría: item.category || '',
        [translations.code]: product.code || '',
        [translations.name]: product.name || '',
        Valor: `${value.toFixed(2)} €`,
        Porcentaje: `${percentage.toFixed(2)}%`,
        'Porcentaje Acumulado': `${cumulativePercentage.toFixed(2)}%`,
      };
    });

    // Validar que el informe tenga summary
    const summary = report.summary || {};
    const categoryA = summary.categoryA || { count: 0, value: 0, percentage: 0 };
    const categoryB = summary.categoryB || { count: 0, value: 0, percentage: 0 };
    const categoryC = summary.categoryC || { count: 0, value: 0, percentage: 0 };

    const sheets = [
      {
        name: lang === 'ca-ES' ? 'Resum' : 'Resumen',
        data: [
          {
            Categoría: 'A',
            Cantidad: categoryA.count ?? 0,
            Valor: `${(categoryA.value ?? 0).toFixed(2)} €`,
            Porcentaje: `${(categoryA.percentage ?? 0).toFixed(2)}%`,
          },
          {
            Categoría: 'B',
            Cantidad: categoryB.count ?? 0,
            Valor: `${(categoryB.value ?? 0).toFixed(2)} €`,
            Porcentaje: `${(categoryB.percentage ?? 0).toFixed(2)}%`,
          },
          {
            Categoría: 'C',
            Cantidad: categoryC.count ?? 0,
            Valor: `${(categoryC.value ?? 0).toFixed(2)} €`,
            Porcentaje: `${(categoryC.percentage ?? 0).toFixed(2)}%`,
          },
          {
            Categoría: 'Total',
            Cantidad: report.classifications.length,
            Valor: `${(summary.totalValue ?? 0).toFixed(2)} €`,
            Porcentaje: '100%',
          },
        ],
      },
      {
        name: lang === 'ca-ES' ? 'Classificació' : 'Clasificación',
        data: exportData,
      },
    ];

    // Verificar si el formato es PDF
    if (config.format === 'pdf') {
      // Convertir datos para PDF
      if (exportData.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((item: Record<string, unknown>) =>
        headers.map((header: string) => String(item[header] || '')),
      );

      const title = lang === 'ca-ES' ? 'Anàlisi ABC' : 'Análisis ABC';

      // Llamar a exportToPDF de forma asíncrona
      ExportService.exportToPDF(title, headers, rows, config).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error al exportar PDF:', error);
      });
    } else {
      ExportService.generateExcel(sheets, config);
    }
  }

  /**
   * Exporta un informe financiero.
   *
   * @param report - Informe financiero
   * @param config - Configuración de exportación
   */
  static async exportFinancialReport(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    report: any,
    config: ExportConfig,
  ): Promise<void> {
    const lang = config.language || 'es-ES';

    // Validar que el informe tenga summary
    if (!report || !report.summary) {
      // eslint-disable-next-line no-console
      console.error('Informe inválido: no tiene summary');
      return;
    }

    const summary = report.summary || {};
    const totalValueAtCost = summary.totalValueAtCost ?? 0;
    const totalValueAtSale = summary.totalValueAtSale ?? 0;
    const potentialMargin = summary.potentialMargin ?? 0;
    const marginPercentage = summary.marginPercentage ?? 0;

    const sheets = [
      {
        name: lang === 'ca-ES' ? 'Resum General' : 'Resumen General',
        data: [
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Valor Total a Coste' : 'Valor Total a Coste',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${totalValueAtCost.toFixed(2)} €`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Valor Total a Venta' : 'Valor Total a Venta',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${totalValueAtSale.toFixed(2)} €`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Marge Potencial' : 'Margen Potencial',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${potentialMargin.toFixed(2)} €`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Percentatge de Marge' : 'Porcentaje de Margen',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: `${marginPercentage.toFixed(2)}%`,
          },
          {
            [lang === 'ca-ES' ? 'Mètrica' : 'Métrica']:
              lang === 'ca-ES' ? 'Total Unitats' : 'Total Unidades',
            [lang === 'ca-ES' ? 'Valor' : 'Valor']: summary.totalUnits ?? 0,
          },
        ],
      },
      {
        name: lang === 'ca-ES' ? 'Per Categoria' : 'Por Categoría',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: (report.byCategory || []).map((item: any) => ({
          Categoría: item.category || '',
          'Valor a Coste': `${(item.valueAtCost ?? 0).toFixed(2)} €`,
          'Valor a Venta': `${(item.valueAtSale ?? 0).toFixed(2)} €`,
          Unidades: item.units ?? 0,
          Porcentaje: `${item.percentage.toFixed(2)}%`,
        })),
      },
      {
        name: lang === 'ca-ES' ? 'Per Magatzem' : 'Por Almacén',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: report.byWarehouse.map((item: any) => ({
          Almacén: item.warehouse,
          'Valor a Coste': `${item.valueAtCost.toFixed(2)} €`,
          'Valor a Venta': `${item.valueAtSale.toFixed(2)} €`,
          Unidades: item.units,
        })),
      },
    ];

    // Verificar si el formato es PDF
    if (config.format === 'pdf') {
      // Convertir datos para PDF - usar la primera hoja (resumen general)
      const summaryData = sheets[0].data;
      if (summaryData.length === 0) {
        // eslint-disable-next-line no-console
        console.error('No hay datos para exportar');
        return;
      }

      const headers = Object.keys(summaryData[0]);
      const rows = summaryData.map((item: Record<string, unknown>) =>
        headers.map((header: string) => String(item[header] || '')),
      );

      const title = lang === 'ca-ES' ? 'Informe Financer' : 'Informe Financiero';

      // Llamar a exportToPDF de forma asíncrona
      ExportService.exportToPDF(title, headers, rows, config).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error al exportar PDF:', error);
      });
    } else {
      ExportService.generateExcel(sheets, config);
    }
  }
}
