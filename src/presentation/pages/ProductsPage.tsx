import { Package, Plus, Download, X } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useProducts } from "../hooks/useProducts";
import { ProductTable } from "../components/products/ProductTable";
import { ProductFilters, type ProductFiltersState } from "../components/products/ProductFilters";
import { ExportDialog, type ColumnOption } from "../components/products/ExportDialog";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchInput } from "../components/ui/SearchInput";
import { formatCurrency } from "../utils/formatCurrency";
import { calculateColumnWidth, formatCurrencyCell, createTotalsRow } from "../utils/excelUtils";

/**
 * Página principal de gestión de productos.
 */
export function ProductsPage() {
  const navigate = useNavigate();
  const { authContext } = useAuth();
  const { t } = useLanguage();
  const { products, loading, error, pagination, list, remove, update } = useProducts();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [showLowStock, setShowLowStock] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [advancedFilters, setAdvancedFilters] = React.useState<ProductFiltersState>({});
  const [showExportDialog, setShowExportDialog] = React.useState(false);

  // Cargar productos cuando cambian los filtros (con debounce para búsqueda)
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await list(
          {
            search: searchTerm || undefined,
            includeInactive: showInactive,
            lowStock: showLowStock || advancedFilters.lowStock || undefined,
            category: advancedFilters.category,
            isBatchTracked: advancedFilters.isBatchTracked
          },
          { page: currentPage, pageSize }
        );
      } catch (err) {
        // Error ya está manejado en el hook
      }
    }, searchTerm ? 300 : 0); // Debounce solo para búsqueda

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showInactive, showLowStock, currentPage, advancedFilters, list]);

  const handleView = (product: any) => {
    navigate(`/products/${product.id}`);
  };

  const handleEdit = (product: any) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleMovement = (product: any) => {
    navigate(`/movements?product=${product.id}`);
  };

  const handleDelete = async (product: Product) => {
    try {
      await remove(product.id);
      // Recargar lista
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked
        },
        { page: currentPage, pageSize: 25 }
      );
    } catch (err) {
      // Error ya está manejado en el hook
    }
  };

  const handleDuplicate = (product: Product) => {
    navigate(`/products/new?duplicate=${product.id}`);
  };

  const handleHistory = (product: Product) => {
    navigate(`/products/${product.id}/history`);
  };

  const handleExportProduct = async (product: Product) => {
    // Exportar producto individual a Excel
    const excelData = [{
      Código: product.code,
      Nombre: product.name,
      Categoría: product.category || "",
      "Stock Actual": product.stockCurrent,
      "Stock Mínimo": product.stockMin,
      "Precio Coste (€)": typeof product.costPrice === "number" ? product.costPrice : parseFloat(product.costPrice?.toString() || "0"),
      "Precio Venta (€)": product.salePrice ? (typeof product.salePrice === "number" ? product.salePrice : parseFloat(product.salePrice.toString())) : "",
      "Código Proveedor": product.supplierCode || ""
    }];

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Producto");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `producto_${product.code}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await update(product.id, {
        isActive: !product.isActive,
        updatedBy: authContext?.profile.id || ""
      });
      // Recargar lista
      await list(
        {
          search: searchTerm || undefined,
          includeInactive: showInactive,
          lowStock: showLowStock || advancedFilters.lowStock || undefined,
          category: advancedFilters.category,
          isBatchTracked: advancedFilters.isBatchTracked
        },
        { page: currentPage, pageSize: 25 }
      );
    } catch (err) {
      // Error ya está manejado en el hook
    }
  };

  const exportColumns: ColumnOption[] = [
    // Por defecto seleccionados según petición: Codi, Nom, Estoc, Mín, Stock Máximo,
    // Pasillo, Estante, Ubicación extra, Código proveedor, Control por lotes
    { key: "code", label: t("table.code"), defaultSelected: true },
    { key: "name", label: t("table.name"), defaultSelected: true },
    { key: "category", label: t("table.category"), defaultSelected: false },
    { key: "barcode", label: "Código de Barras", defaultSelected: false },
    { key: "stockCurrent", label: t("table.stock"), defaultSelected: true },
    { key: "stockMin", label: t("table.min"), defaultSelected: true },
    { key: "stockMax", label: "Stock Máximo", defaultSelected: true },
    { key: "aisle", label: "Pasillo", defaultSelected: true },
    { key: "shelf", label: "Estante", defaultSelected: true },
    { key: "locationExtra", label: "Ubicación Extra", defaultSelected: true },
    { key: "costPrice", label: "Precio Coste (€)", defaultSelected: false },
    { key: "salePrice", label: "Precio Venta (€)", defaultSelected: false },
    { key: "supplierCode", label: t("table.supplierCode"), defaultSelected: true },
    { key: "isBatchTracked", label: "Control por Lotes", defaultSelected: true },
    { key: "unitOfMeasure", label: "Unidad de Medida", defaultSelected: false },
    { key: "isActive", label: t("table.status"), defaultSelected: false }
  ];

  const handleExportExcel = React.useCallback(async (
    selectedColumns: string[], 
    format: "xlsx" | "csv" = "xlsx",
    includeFilters: boolean = false
  ) => {
    try {
      if (!products || products.length === 0 || selectedColumns.length === 0) {
        // eslint-disable-next-line no-console
        console.warn("No hay productos o columnas seleccionadas para exportar");
        throw new Error("No hay productos o columnas seleccionadas para exportar");
      }

    // Mapeo de columnas
    const columnMap: Record<string, (p: any) => any> = {
      code: (p) => p.code,
      name: (p) => p.name,
      category: (p) => p.category || "",
      barcode: (p) => p.barcode || "",
      stockCurrent: (p) => p.stockCurrent,
      stockMin: (p) => p.stockMin,
      stockMax: (p) => p.stockMax || "",
      aisle: (p) => p.aisle,
      shelf: (p) => p.shelf,
      locationExtra: (p) => p.locationExtra || "",
      costPrice: (p) => typeof p.costPrice === "number" ? p.costPrice : parseFloat(p.costPrice?.toString() || "0"),
      salePrice: (p) => p.salePrice ? (typeof p.salePrice === "number" ? p.salePrice : parseFloat(p.salePrice.toString())) : "",
      supplierCode: (p) => p.supplierCode || "",
      isBatchTracked: (p) => p.isBatchTracked ? "Sí" : "No",
      unitOfMeasure: (p) => p.unitOfMeasure || "",
      isActive: (p) => p.isActive ? "Activo" : "Inactivo"
    };

    // Preparar datos para Excel solo con columnas seleccionadas
    const excelData = products.map((product) => {
      const row: Record<string, any> = {};
      selectedColumns.forEach((colKey) => {
        const column = exportColumns.find((c) => c.key === colKey);
        if (column && columnMap[colKey]) {
          row[column.label] = columnMap[colKey](product);
        }
      });
      return row;
    });

    // Crear workbook y worksheet
    let worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // Nota: xlsx básico no soporta estilos directamente.
    // Para estilos avanzados, se necesitaría xlsx-style o exceljs.
    // Por ahora, aplicamos formato numérico donde sea posible.
    
    const headerRow = excelData.length > 0 ? Object.keys(excelData[0]) : [];
    
    // Formatear columnas de precio como moneda (formato numérico)
    headerRow.forEach((colName) => {
      if (colName.includes("(€)") || colName.includes("Precio")) {
        const colIndex = headerRow.indexOf(colName);
        if (colIndex >= 0) {
          for (let row = 1; row <= excelData.length; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
            if (worksheet[cellAddress] && worksheet[cellAddress].v !== "" && typeof worksheet[cellAddress].v === "number") {
              worksheet[cellAddress].z = "#,##0.00"; // Formato numérico con separadores de miles
              worksheet[cellAddress].t = "n"; // Tipo numérico
            }
          }
        }
      }
    });

    // Calcular ancho automático de columnas basado en contenido
    const columnWidths: { wch: number }[] = [];
    
    headerRow.forEach((colName) => {
      const columnData = excelData.map((row) => row[colName]);
      const width = calculateColumnWidth(columnData, colName);
      columnWidths.push({ wch: width });
    });
    
    worksheet["!cols"] = columnWidths;
    
    // Añadir fila de totales si hay columnas numéricas
    const numericColumns: Record<string, "sum" | "avg"> = {};
    headerRow.forEach((colName) => {
      if (colName.includes("Stock") || colName.includes("stock")) {
        numericColumns[colName] = "sum";
      } else if (colName.includes("Precio") || colName.includes("precio")) {
        numericColumns[colName] = "sum";
      }
    });
    
    if (Object.keys(numericColumns).length > 0 && excelData.length > 0) {
      const totalsRow = createTotalsRow(excelData, headerRow, numericColumns);
      const totalsData: Record<string, any> = {};
      headerRow.forEach((col) => {
        if (numericColumns[col]) {
          totalsData[col] = totalsRow[col] || 0;
        } else {
          totalsData[col] = col === headerRow[0] ? "TOTALES" : "";
        }
      });
      
      // Añadir fila de totales al final
      excelData.push(totalsData);
      
      // Recrear worksheet con totales
      const newWorksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Aplicar formato numérico a los totales
      const lastRow = excelData.length - 1;
      headerRow.forEach((colName, colIndex) => {
        if (numericColumns[colName]) {
          const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: colIndex });
          if (newWorksheet[cellAddress] && typeof newWorksheet[cellAddress].v === "number") {
            newWorksheet[cellAddress].z = colName.includes("Precio") ? "#,##0.00" : "#,##0";
            newWorksheet[cellAddress].t = "n";
          }
        }
      });
      
      // Reemplazar worksheet
      workbook.Sheets["Productos"] = newWorksheet;
      worksheet = newWorksheet;
    }

    // Freeze panes en header
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Generar archivo según formato
    let blob: Blob;
    let fileName: string;
    let mimeType: string;

    if (format === "csv") {
      // Convertir a CSV (UTF-8 con BOM para que Excel muestre bien acentos y caracteres especiales)
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const bom = "\uFEFF"; // Byte Order Mark para UTF-8
      blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      fileName = `productos_${new Date().toISOString().split("T")[0]}.csv`;
      mimeType = "text/csv";
    } else {
      // Excel (xlsx) - formato por defecto
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      fileName = `productos_${new Date().toISOString().split("T")[0]}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // Crear enlace de descarga
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
      // eslint-disable-next-line no-console
      console.log(`✅ Archivo ${format.toUpperCase()} generado y descargado: ${fileName}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error al exportar productos:", error);
      throw error; // Re-lanzar el error para que el modal pueda manejarlo
    }
  }, [products, exportColumns]);

  const canCreate = authContext?.permissions?.includes("products.create") ?? false;
  const canView = authContext?.permissions?.includes("products.view") ?? false;
  const canEdit = authContext?.permissions?.includes("products.edit") ?? false;
  const canCreateMovement = authContext?.permissions?.includes("movements.create") ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t("products.title")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} {t("products.total")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!products || products.length === 0}
            title={t("products.export")}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("products.export")}
          </Button>
          {canCreate && (
            <Button onClick={() => navigate("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("products.new")}
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4 flex-wrap">
            <div className="flex-1 max-w-md min-w-[200px]">
              <SearchInput
                placeholder={t("products.search")}
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <ProductFilters
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              onClear={() => {
                setAdvancedFilters({});
                setShowLowStock(false);
              }}
            />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{t("products.includeInactive")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{t("products.lowStockOnly")}</span>
            </label>
          </div>
        </div>
        
        {/* Chips de filtros activos */}
        {(searchTerm || showInactive || showLowStock || Object.keys(advancedFilters).length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {searchTerm && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                {t("products.search")}: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {showLowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {t("products.lowStockOnly")}
                <button
                  onClick={() => setShowLowStock(false)}
                  className="ml-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {showInactive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                {t("products.includeInactive")}
                <button
                  onClick={() => setShowInactive(false)}
                  className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {t("table.category")}: {advancedFilters.category}
                <button
                  onClick={() => setAdvancedFilters({ ...advancedFilters, category: undefined })}
                  className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.isBatchTracked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                Solo con lotes
                <button
                  onClick={() => setAdvancedFilters({ ...advancedFilters, isBatchTracked: undefined })}
                  className="ml-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.stockMin !== undefined || advancedFilters.stockMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Stock: {advancedFilters.stockMin ?? "0"} - {advancedFilters.stockMax ?? "∞"}
                <button
                  onClick={() => setAdvancedFilters({ ...advancedFilters, stockMin: undefined, stockMax: undefined })}
                  className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(advancedFilters.priceMin !== undefined || advancedFilters.priceMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                Precio: {advancedFilters.priceMin ?? "0"}€ - {advancedFilters.priceMax ?? "∞"}€
                <button
                  onClick={() => setAdvancedFilters({ ...advancedFilters, priceMin: undefined, priceMax: undefined })}
                  className="ml-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {advancedFilters.supplierCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                {t("table.supplierCode")}: {advancedFilters.supplierCode}
                <button
                  onClick={() => setAdvancedFilters({ ...advancedFilters, supplierCode: undefined })}
                  className="ml-1 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Tabla */}
      <ProductTable
        products={products ?? []}
        loading={loading}
        searchTerm={searchTerm}
        onView={canView ? handleView : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onMovement={canCreateMovement ? handleMovement : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        onDuplicate={canCreate ? handleDuplicate : undefined}
        onHistory={canView ? handleHistory : undefined}
        onExport={canView ? handleExportProduct : undefined}
        onToggleActive={canEdit ? handleToggleActive : undefined}
      />

      {/* Paginación mejorada */}
      {pagination.total > pagination.pageSize && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("pagination.showing")} {((currentPage - 1) * pagination.pageSize) + 1} - {Math.min(currentPage * pagination.pageSize, pagination.total)} {t("pagination.of")} {pagination.total} {t("products.title").toLowerCase()}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                {t("pagination.itemsPerPage") || "Por página:"}
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title={t("pagination.first") || "Primera página"}
            >
              ««
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              {t("pagination.previous")}
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("pagination.page") || "Página"}
              </span>
              <Input
                type="number"
                min={1}
                max={Math.ceil(pagination.total / pagination.pageSize)}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10);
                  if (page >= 1 && page <= Math.ceil(pagination.total / pagination.pageSize)) {
                    setCurrentPage(page);
                  }
                }}
                className="w-16 text-center"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                / {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pagination.pageSize >= pagination.total}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              {t("pagination.next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pagination.pageSize >= pagination.total}
              onClick={() => setCurrentPage(Math.ceil(pagination.total / pagination.pageSize))}
              title={t("pagination.last") || "Última página"}
            >
              »»
            </Button>
          </div>
        </div>
      )}

      {/* Modal de exportación */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        columns={exportColumns}
        onExport={handleExportExcel}
        fileName={`productos_${new Date().toISOString().split("T")[0]}`}
      />
    </div>
  );
}

