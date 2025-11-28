import { Package, Plus, Download } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { useProducts } from "../hooks/useProducts";
import { ProductTable } from "../components/products/ProductTable";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SearchInput } from "../components/ui/SearchInput";

/**
 * Página principal de gestión de productos.
 */
export function ProductsPage() {
  const navigate = useNavigate();
  const { authContext } = useAuth();
  const { products, loading, error, pagination, list } = useProducts();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [showLowStock, setShowLowStock] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Cargar productos cuando cambian los filtros (con debounce para búsqueda)
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await list(
          {
            search: searchTerm || undefined,
            includeInactive: showInactive,
            lowStock: showLowStock || undefined
          },
          { page: currentPage, pageSize: 25 }
        );
      } catch (err) {
        // Error ya está manejado en el hook
      }
    }, searchTerm ? 300 : 0); // Debounce solo para búsqueda

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showInactive, showLowStock, currentPage, list]);

  const handleView = (product: any) => {
    navigate(`/products/${product.id}`);
  };

  const handleEdit = (product: any) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleMovement = (product: any) => {
    navigate(`/movements?product=${product.id}`);
  };

  const handleExportExcel = React.useCallback(() => {
    if (!products || products.length === 0) {
      return;
    }

    // Preparar datos para Excel
    const excelData = products.map((product) => ({
      Código: product.code,
      Nombre: product.name,
      Categoría: product.category || "",
      "Código de Barras": product.barcode || "",
      "Stock Actual": product.stockCurrent,
      "Stock Mínimo": product.stockMin,
      "Stock Máximo": product.stockMax || "",
      Pasillo: product.aisle,
      Estante: product.shelf,
      "Ubicación Extra": product.locationExtra || "",
      "Precio Coste": product.costPrice,
      "Precio Venta": product.salePrice || "",
      "Código Proveedor": product.supplierCode || "",
      "Control por Lotes": product.isBatchTracked ? "Sí" : "No",
      "Unidad de Medida": product.unitOfMeasure || "",
      Estado: product.isActive ? "Activo" : "Inactivo",
      Notas: product.notes || ""
    }));

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

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
      { wch: 12 }, // Precio Coste
      { wch: 12 }, // Precio Venta
      { wch: 15 }, // Código Proveedor
      { wch: 15 }, // Control por Lotes
      { wch: 15 }, // Unidad de Medida
      { wch: 10 }, // Estado
      { wch: 30 }  // Notas
    ];
    worksheet["!cols"] = columnWidths;

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Productos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} productos en total
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={!products || products.length === 0}
            title="Exportar productos a Excel"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          {canCreate && (
            <Button onClick={() => navigate("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Buscar por código, nombre o barcode..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Incluir inactivos</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Solo en alarma</span>
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
      />

      {/* Paginación */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {((currentPage - 1) * pagination.pageSize) + 1} - {Math.min(currentPage * pagination.pageSize, pagination.total)} de {pagination.total} productos
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
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pagination.pageSize >= pagination.total}
              onClick={() => {
                setCurrentPage(prev => prev + 1);
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

