import { ArrowLeft, Package, History } from "lucide-react";
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { MovementTable } from "../components/movements/MovementTable";
import { useLanguage } from "../context/LanguageContext";
import { useMovements } from "../hooks/useMovements";
import { useProducts } from "../hooks/useProducts";

/**
 * Página que muestra el historial de movimientos de un producto específico.
 */
export function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getById } = useProducts();
  const [product, setProduct] = React.useState<any>(null);
  const [loadingProduct, setLoadingProduct] = React.useState(true);

  // Configurar filtros para mostrar solo movimientos de este producto
  const {
    movements,
    loading: loadingMovements,
    error,
    totalCount,
    page,
    totalPages,
    filters,
    setFilters,
    setPage,
    refresh
  } = useMovements();

  // Cargar información del producto y aplicar filtro
  React.useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      setLoadingProduct(true);
      try {
        const productData = await getById(id);
        setProduct(productData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando producto:", err);
      } finally {
        setLoadingProduct(false);
      }
    };

    loadProduct();
  }, [id, getById]);

  // Aplicar filtro de producto a los movimientos
  React.useEffect(() => {
    if (id) {
      setFilters({ productId: id });
    }
  }, [id, setFilters]);

  if (loadingProduct) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <Package className="mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
          {t("products.notFound") || "Producto no encontrado"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/products")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/products/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <History className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {t("products.history") || "Historial de Movimientos"}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {product.code} - {product.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información del producto */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("table.stock")}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {product.stockCurrent}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("table.min")}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {product.stockMin}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("movements.total") || "Total Movimientos"}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {totalCount}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabla de movimientos */}
      <MovementTable
        movements={movements}
        loading={loadingMovements}
        onViewProduct={(productId) => navigate(`/products/${productId}`)}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pagination.showing")} {(page - 1) * 20 + 1} - {Math.min(page * 20, totalCount)}{" "}
            {t("pagination.of")} {totalCount} {t("movements.title").toLowerCase()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      {movements.length === 0 && !loadingMovements && (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <History className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            {t("movements.noMovements") || "No hay movimientos registrados"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("movements.noMovementsDesc") || "Este producto aún no tiene movimientos de inventario"}
          </p>
        </div>
      )}
    </div>
  );
}

