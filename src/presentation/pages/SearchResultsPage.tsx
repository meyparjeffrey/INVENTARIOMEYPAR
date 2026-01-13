/**
 * Página de resultados de búsqueda de productos.
 * 
 * Muestra todos los resultados de una búsqueda con diseño moderno y profesional.
 * Incluye botón para volver a la página de productos y limpiar la búsqueda.
 * 
 * @module @presentation/pages/SearchResultsPage
 */

import { ArrowLeft, X, Search } from "lucide-react";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useProducts } from "../hooks/useProducts";
import { ProductTable } from "../components/products/ProductTable";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../lib/cn";

/**
 * Página de resultados de búsqueda de productos.
 * 
 * Muestra todos los productos que coinciden con el término de búsqueda.
 * Permite modificar la búsqueda y volver a la página de productos.
 */
export function SearchResultsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";

  const [currentSearchTerm, setCurrentSearchTerm] = React.useState(searchTerm);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(25);

  const { products, loading, error, pagination, list } = useProducts();

  // Cargar resultados cuando cambia el término de búsqueda
  React.useEffect(() => {
    if (searchTerm.trim().length >= 3) {
      list(
        { search: searchTerm.trim() },
        { page: currentPage, pageSize }
      );
    }
  }, [searchTerm, currentPage, pageSize, list]);

  // Sincronizar el término de búsqueda con la URL
  React.useEffect(() => {
    setCurrentSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleSearch = (term: string) => {
    if (term.trim().length >= 3 || term.trim().length === 0) {
      setSearchParams({ q: term.trim() });
      setCurrentPage(1);
    }
  };

  const handleBack = () => {
    // Volver a la página anterior usando el historial del navegador
    navigate(-1);
  };

  const handleClear = () => {
    // Limpiar la búsqueda y volver a la página anterior
    setSearchParams({});
    navigate(-1);
  };

  const handleView = (product: { id: string }) => {
    navigate(`/products/${product.id}`);
  };

  const handleEdit = (product: { id: string }) => {
    navigate(`/products/${product.id}/edit`);
  };

  const totalResults = pagination?.total || 0;
  const hasResults = totalResults > 0;
  const isLoading = loading && !products;

  return (
    <div className="flex h-full flex-col">
      {/* Header de búsqueda */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back") || "Volver"}
          </Button>

          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={t("products.searchPlaceholder") || "Buscar por código o nombre..."}
              value={currentSearchTerm}
              onChange={(e) => setCurrentSearchTerm(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("text");
                if (pastedText) {
                  setCurrentSearchTerm(pastedText);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(currentSearchTerm);
                }
              }}
              className="pl-9 pr-10"
              autoFocus
            />
            {currentSearchTerm && (
              <button
                type="button"
                onClick={() => {
                  setCurrentSearchTerm("");
                  handleSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchTerm && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t("common.clear") || "Limpiar"}
            </Button>
          )}
        </div>

        {/* Información de resultados */}
        {searchTerm && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  t("common.loading") || "Cargando..."
                ) : hasResults ? (
                  <>
                    {t("products.searchResults") || "Resultados de búsqueda"}:
                    <span className="ml-2 font-semibold text-primary-600 dark:text-primary-400">
                      {totalResults} {t("products.products") || "productos"}
                    </span>
                    {t("products.for") || "para"} &quot;{searchTerm}&quot;
                  </>
                ) : (
                  <>
                    {t("products.noResults") || "No se encontraron resultados"} para &quot;{searchTerm}&quot;
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {!searchTerm ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t("products.searchTitle") || "Buscar productos"}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("products.searchDescription") || "Escribe al menos 3 caracteres para buscar productos"}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t("common.loading") || "Cargando resultados..."}
              </p>
            </div>
          </div>
        ) : !hasResults ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                {t("products.noResults") || "No se encontraron resultados"}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("products.tryDifferentSearch") || "Intenta con un término de búsqueda diferente"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ProductTable
              products={products || []}
              loading={loading}
              onView={handleView}
              onEdit={handleEdit}
            />

            {/* Paginación */}
            {pagination && pagination.total > pageSize && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("products.showing") || "Mostrando"} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.total)} {t("products.of") || "de"} {pagination.total} {t("products.products") || "productos"}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("common.previous") || "Anterior"}
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t("common.page") || "Página"} {currentPage} / {Math.ceil(pagination.total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= Math.ceil(pagination.total / pageSize)}
                  >
                    {t("common.next") || "Siguiente"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

