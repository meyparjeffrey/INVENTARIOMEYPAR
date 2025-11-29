import { Package, Plus, Download } from "lucide-react";
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
          { page: currentPage, pageSize: 25 }
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
    { key: "code", label: t("table.code"), defaultSelected: true },
    { key: "name", label: t("table.name"), defaultSelected: true },
    { key: "category", label: t("table.category"), defaultSelected: true },
    { key: "barcode", label: "Código de Barras", defaultSelected: false },
    { key: "stockCurrent", label: t("table.stock"), defaultSelected: true },
    { key: "stockMin", label: t("table.min"), defaultSelected: true },
    { key: "stockMax", label: "Stock Máximo", defaultSelected: false },
    { key: "aisle", label: "Pasillo", defaultSelected: false },
    { key: "shelf", label: "Estante", defaultSelected: false },
    { key: "locationExtra", label: "Ubicación Extra", defaultSelected: false },
    { key: "costPrice", label: "Precio Coste (€)", defaultSelected: true },
    { key: "salePrice", label: "Precio Venta (€)", defaultSelected: false },
    { key: "supplierCode", label: t("table.supplierCode"), defaultSelected: true },
    { key: "isBatchTracked", label: "Control por Lotes", defaultSelected: false },
    { key: "unitOfMeasure", label: "Unidad de Medida", defaultSelected: false },
    { key: "isActive", label: t("table.status"), defaultSelected: true }
  ];

  const handleExportExcel = React.useCallback((selectedColumns: string[]) => {
    if (!products || products.length === 0 || selectedColumns.length === 0) {
      return;
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
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // Estilizar encabezados
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "E62144" } }, // Color primario corporativo
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Formatear columnas de precio como moneda
    const headerRow = excelData.length > 0 ? Object.keys(excelData[0]) : [];
    headerRow.forEach((colName) => {
      if (colName.includes("(€)") || colName.includes("Precio")) {
        const colIndex = headerRow.indexOf(colName);
        if (colIndex >= 0) {
          for (let row = 1; row <= excelData.length; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
            if (worksheet[cellAddress] && worksheet[cellAddress].v !== "" && typeof worksheet[cellAddress].v === "number") {
              worksheet[cellAddress].z = "#,##0.00 €";
              worksheet[cellAddress].t = "n"; // Tipo numérico
            }
          }
        }
      }
    });

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 12 }, // Código
      { wch: 30 }, // Nombre
      { wch: 15 }, // Categoría
      { wch: 15 }, // Código de Barras
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Stock Mínimo
      { wch: 12 }, // Stock Máximo
      { wch: 10 }, // Pasillo
      { wch: 10 }, // Estante
      { wch: 15 }, // Ubicación Extra
      { wch: 15 }, // Precio Coste (€)
      { wch: 15 }, // Precio Venta (€)
      { wch: 15 }, // Código Proveedor
      { wch: 15 }, // Control por Lotes
      { wch: 15 }, // Unidad de Medida
      { wch: 10 }  // Estado
    ];
    worksheet["!cols"] = columnWidths;

    // Freeze panes en header
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Generar archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    // Crear enlace de descarga
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `productos_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [products]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex-1 max-w-md">
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">{t("products.includeInactive")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
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
        onView={canView ? handleView : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onMovement={canCreateMovement ? handleMovement : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        onDuplicate={canCreate ? handleDuplicate : undefined}
        onHistory={canView ? handleHistory : undefined}
        onExport={canView ? handleExportProduct : undefined}
        onToggleActive={canEdit ? handleToggleActive : undefined}
      />

      {/* Paginación */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pagination.showing")} {((currentPage - 1) * pagination.pageSize) + 1} - {Math.min(currentPage * pagination.pageSize, pagination.total)} {t("pagination.of")} {pagination.total} {t("products.title").toLowerCase()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
              }}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pagination.pageSize >= pagination.total}
              onClick={() => {
                setCurrentPage(prev => prev + 1);
              }}
            >
              {t("pagination.next")}
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

