import { Package, Plus } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
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

  // Cargar productos cuando cambian los filtros (con debounce para búsqueda)
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await list({
          search: searchTerm || undefined,
          includeInactive: showInactive
        });
      } catch (err) {
        // Error ya está manejado en el hook
      }
    }, searchTerm ? 300 : 0); // Debounce solo para búsqueda

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showInactive, list]);

  const handleView = (product: any) => {
    navigate(`/products/${product.id}`);
  };

  const handleEdit = (product: any) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleMovement = (product: any) => {
    navigate(`/movements?product=${product.id}`);
  };

  const canCreate = authContext?.permissions?.includes("products.create") ?? false;

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
        {canCreate && (
          <Button onClick={() => navigate("/products/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
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
        onView={handleView}
        onEdit={handleEdit}
        onMovement={handleMovement}
      />

      {/* Paginación básica */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {(products ?? []).length} de {pagination.total} productos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                // TODO: Implementar paginación
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => {
                // TODO: Implementar paginación
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

