/**
 * Servicio de exportación de informes.
 *
 * Exporta informes a diferentes formatos (Excel, PDF, CSV, JSON)
 * con soporte multiidioma y formato profesional.
 *
 * @module @application/services/ReportExportService
 * @requires @domain/entities/Report
 * @requires xlsx
 */

import * as XLSX from 'xlsx';
import type { Report } from '@domain/entities/Report';

/**
 * Descarga un blob como archivo de forma robusta.
 *
 * @param blob - Blob a descargar
 * @param fileName - Nombre del archivo
 * @returns Promise que se resuelve cuando la descarga inicia
 */
function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      // Añadir al DOM
      document.body.appendChild(link);

      // Hacer clic
      link.click();

      // Limpiar después de un breve delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Servicio de exportación de informes.
 */
export class ReportExportService {
  /**
   * Exporta un informe a Excel.
   *
   * @param report - Informe a exportar
   * @param includeCharts - Si incluir gráficos (no implementado aún)
   * @returns Nombre del archivo generado
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async exportToExcel(
    report: Report,
    _includeCharts: boolean = false,
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();
    if (!workbook) {
      throw new Error('No se pudo crear el workbook de Excel');
    }
    const lang = report.language;

    // Debug: Verificar que el reporte tiene tableData
    console.log('ReportExportService.exportToExcel - Report data:', {
      type: report.type,
      hasTableData: !!report.tableData,
      hasHeaders: report.tableData?.headers?.length > 0,
      rowsCount: report.tableData?.rows?.length || 0,
      headers: report.tableData?.headers,
      firstRow: report.tableData?.rows?.[0],
      sampleData: report.tableData?.rows?.slice(0, 3),
    });

    // Hoja 1: Datos de tabla - AHORA ES LA PRIMERA HOJA
    if (
      report.tableData &&
      report.tableData.headers &&
      report.tableData.headers.length > 0
    ) {
      console.log('📊 Preparando tabla principal (Dades)...');

      // Construir la matriz de datos (headers + rows + totals)
      const tableRows: (string | number)[][] = [report.tableData.headers];

      // Añadir datos
      report.tableData.rows.forEach((row) => {
        const mappedRow = report.tableData.headers.map((header) => {
          const val = row[header];
          return val === null || val === undefined ? '' : val;
        });
        tableRows.push(mappedRow);
      });

      // Añadir totales si existen
      if (report.tableData.totals) {
        const totalsRow = report.tableData.headers.map((header) => {
          const val = report.tableData.totals?.[header];
          return val === null || val === undefined ? '' : val;
        });
        tableRows.push(totalsRow);
      }

      const dataSheet = XLSX.utils.aoa_to_sheet(tableRows);

      // Añadir la hoja de DATOS primero
      XLSX.utils.book_append_sheet(
        workbook,
        dataSheet,
        lang === 'ca-ES' ? 'Dades' : 'Datos',
      );
    } else {
      // Si no hay tableData o headers, crear hoja vacía con mensaje
      console.warn('ReportExportService: No tableData found in report', {
        hasTableData: !!report.tableData,
        hasHeaders: report.tableData?.headers?.length > 0,
        reportType: report.type,
      });
      const emptySheet = XLSX.utils.aoa_to_sheet([
        [
          lang === 'ca-ES'
            ? 'No hi ha dades de taula disponibles'
            : 'No hay datos de tabla disponibles',
        ],
      ]);
      XLSX.utils.book_append_sheet(
        workbook,
        emptySheet,
        lang === 'ca-ES' ? 'Dades' : 'Datos',
      );
    }

    // Hoja 2: KPIs
    const kpiData = [
      [lang === 'ca-ES' ? 'KPI' : 'KPI', lang === 'ca-ES' ? 'Valor' : 'Valor'],
      ...Object.entries(report.kpis || {}).map(([key, value]) => [
        key,
        typeof value === 'number' ? value : String(value),
      ]),
    ];
    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, lang === 'ca-ES' ? 'KPIs' : 'KPIs');

    // Hoja 3: Filtros aplicados
    if (Object.keys(report.filters).length > 0) {
      const filterData = [
        [lang === 'ca-ES' ? 'Filtre' : 'Filtro', lang === 'ca-ES' ? 'Valor' : 'Valor'],
        ...Object.entries(report.filters)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => [key, String(value)]),
      ];
      const filterSheet = XLSX.utils.aoa_to_sheet(filterData);
      XLSX.utils.book_append_sheet(
        workbook,
        filterSheet,
        lang === 'ca-ES' ? 'Filtres' : 'Filtros',
      );
    }

    // Generar nombre de archivo
    const fileName = `${report.type}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Verificar hojas creadas antes de exportar
    console.log('📋 Hojas en el workbook antes de exportar:');
    console.log('  Nombres de hojas:', workbook.SheetNames);
    console.log('  Total de hojas:', workbook.SheetNames.length);
    workbook.SheetNames.forEach((name) => {
      const sheet = workbook.Sheets[name];
      const cellCount = sheet
        ? Object.keys(sheet).filter((k) => !k.startsWith('!')).length
        : 0;
      console.log(`  Hoja "${name}":`, {
        existe: !!sheet,
        rango: sheet?.['!ref'] || 'SIN RANGO',
        celdas: cellCount,
        primeraCelda: sheet?.['A1'] ? `${sheet['A1'].v} (${sheet['A1'].t})` : 'VACÍO',
        segundaCelda: sheet?.['A2'] ? `${sheet['A2'].v} (${sheet['A2'].t})` : 'VACÍO',
      });
    });

    // Usar método con blob directamente para mayor compatibilidad
    // XLSX.writeFile a veces tiene problemas con hojas grandes o datos complejos
    try {
      console.log('📝 Generando binario de Excel...');
      // Usar tipo 'binary' y convertir a array buffer manualmente para máxima compatibilidad
      const wbout = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'binary',
      });

      const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
      };

      const blob = new Blob([s2ab(wbout)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      console.log('💾 Archivo generado, tamaño:', blob.size, 'bytes');

      await downloadBlob(blob, fileName);
      return fileName;
    } catch (error) {
      console.error('❌ Error exportando Excel:', error);
      throw new Error(
        `No se pudo exportar el archivo Excel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Exporta un informe a CSV.
   *
   * @param report - Informe a exportar
   * @returns Nombre del archivo generado
   */
  static async exportToCSV(report: Report): Promise<string> {
    if (!report.tableData || report.tableData.headers.length === 0) {
      throw new Error('No hay datos de tabla para exportar');
    }

    const rows = [
      report.tableData.headers,
      ...report.tableData.rows.map((row) =>
        report.tableData.headers.map((header) => String(row[header] ?? '')),
      ),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const fileName = `${report.type}_${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    await downloadBlob(blob, fileName);
    return fileName;
  }

  /**
   * Exporta un informe a JSON.
   *
   * @param report - Informe a exportar
   * @returns Nombre del archivo generado
   */
  static async exportToJSON(report: Report): Promise<string> {
    const jsonContent = JSON.stringify(report, null, 2);
    const fileName = `${report.type}_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

    await downloadBlob(blob, fileName);
    return fileName;
  }

  /**
   * Exporta un informe a PDF (requiere jsPDF).
   *
   * @param report - Informe a exportar
   * @returns Nombre del archivo generado
   */
  static async exportToPDF(report: Report): Promise<string> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    const lang = report.language;
    const isCatalan = lang === 'ca-ES';

    // Título
    doc.setFontSize(18);
    doc.text(report.title, 14, 20);

    // Descripción
    doc.setFontSize(12);
    doc.text(report.description || '', 14, 30);

    // Fecha de generación
    doc.setFontSize(10);
    const generatedDate = new Date(report.generatedAt).toLocaleDateString(lang);
    doc.text(`${isCatalan ? 'Generat el' : 'Generado el'}: ${generatedDate}`, 14, 40);

    let yPosition = 50;

    // KPIs
    if (Object.keys(report.kpis).length > 0) {
      doc.setFontSize(14);
      doc.text(isCatalan ? 'KPIs' : 'KPIs', 14, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      Object.entries(report.kpis).forEach(([key, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${key}: ${String(value)}`, 14, yPosition);
        yPosition += 7;
      });
      yPosition += 5;
    }

    // Tabla de datos
    if (report.tableData && report.tableData.headers.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text(isCatalan ? 'Dades' : 'Datos', 14, yPosition);
      yPosition += 10;

      const tableData = [
        report.tableData.headers,
        ...report.tableData.rows.map((row) =>
          report.tableData.headers.map((header) => {
            const value = row[header];
            return value !== null && value !== undefined ? String(value) : '';
          }),
        ),
      ];

      // Si no hay filas, añadir mensaje
      if (report.tableData.rows.length === 0) {
        tableData.push([
          isCatalan ? 'No hi ha dades disponibles' : 'No hay datos disponibles',
          ...Array(report.tableData.headers.length - 1).fill(''),
        ]);
      }

      if (report.tableData.totals) {
        tableData.push(
          report.tableData.headers.map((header) => {
            const value = report.tableData.totals?.[header];
            return value !== null && value !== undefined ? String(value) : '';
          }),
        );
      }

      autoTable(doc, {
        head: [tableData[0]],
        body: tableData.slice(1),
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      });
    } else {
      // Si no hay tableData, añadir mensaje
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.text(isCatalan ? 'Dades' : 'Datos', 14, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.text(
        isCatalan
          ? 'No hi ha dades de taula disponibles'
          : 'No hay datos de tabla disponibles',
        14,
        yPosition,
      );
    }

    // Filtros aplicados
    if (Object.keys(report.filters).length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(isCatalan ? 'Filtres Aplicats' : 'Filtros Aplicados', 14, 20);

      doc.setFontSize(10);
      let filterY = 30;
      Object.entries(report.filters)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => {
          doc.text(`${key}: ${String(value)}`, 14, filterY);
          filterY += 7;
        });
    }

    // Generar nombre de archivo
    const fileName = `${report.type}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Descargar
    doc.save(fileName);
    return fileName;
  }
}
