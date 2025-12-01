import { Plus, RefreshCw, Download, ArrowUpDown } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { MovementTable } from "../components/movements/MovementTable";
import { MovementFilters } from "../components/movements/MovementFilters";
import { MovementForm } from "../components/movements/MovementForm";
import { useLanguage } from "../context/LanguageContext";
import { useMovements } from "../hooks/useMovements";
import { useProducts } from "../hooks/useProducts";

/**
 * Página principal de movimientos de inventario.
 */
export function MovementsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const {
    movements,
    loading,
    error,
    totalCount,
    page,
    totalPages,
    filters,
    setFilters,
    setPage,
    refresh,
    recordMovement
  } = useMovements();

  const { products } = useProducts();

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleRecordMovement = async (data: Parameters<typeof recordMovement>[0]) => {
    await recordMovement(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t("movements.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount} {t("movements.total")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("movements.new")}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <MovementFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabla */}
      <MovementTable
        movements={movements}
        loading={loading}
        onViewProduct={handleViewProduct}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("pagination.showing")} {(page - 1) * 20 + 1}-
            {Math.min(page * 20, totalCount)} {t("pagination.of")} {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de nuevo movimiento */}
      <MovementForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleRecordMovement}
        products={products}
      />
    </div>
  );
}

