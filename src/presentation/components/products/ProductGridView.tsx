import { AlertTriangle, Edit, Eye, Package, Trash2, Copy, History, Download as DownloadIcon, MoreVertical } from "lucide-react";
import * as React from "react";
import type { Product } from "@domain/entities";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { highlightText } from "../../utils/highlightText";
import { formatCurrency } from "../../utils/formatCurrency";
import { motion } from "framer-motion";

interface ProductGridViewProps {
  products: Product[];
  loading?: boolean;
  searchTerm?: string;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onMovement?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onHistory?: (product: Product) => void;
  onExport?: (product: Product) => void;
  onToggleActive?: (product: Product) => void;
}

/**
 * Vista de tarjetas (grid) para productos con diseño moderno.
 */
export function ProductGridView({
  products,
  loading = false,
  searchTerm = "",
  onView,
  onEdit,
  onMovement,
  onDelete,
  onDuplicate,
  onHistory,
  onExport,
  onToggleActive
}: ProductGridViewProps) {
  const { t } = useLanguage();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mb-3 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2 w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mb-3 space-y-1">
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Package className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{t("products.noProducts")}</p>
        <p className="text-sm">{t("products.createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => {
        const isLowStock = product.stockCurrent <= product.stockMin;
        const isHovered = hoveredCard === product.id;
        const stockPercentage = product.stockMax
          ? Math.min((product.stockCurrent / product.stockMax) * 100, 100)
          : product.stockCurrent > 0 ? 100 : 0;

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group relative rounded-lg border-2 bg-white p-4 shadow-sm transition-all duration-200",
              "hover:border-primary-500 hover:shadow-md dark:bg-gray-800",
              isLowStock && "border-amber-300 dark:border-amber-700",
              !isLowStock && "border-gray-200 dark:border-gray-700"
            )}
            onMouseEnter={() => setHoveredCard(product.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Header con código y estado */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                  {highlightText(product.code, searchTerm)}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {highlightText(product.name, searchTerm)}
                </p>
              </div>
              {isLowStock && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-3 w-3" />
                  {t("products.alarm")}
                </span>
              )}
            </div>

            {/* Información de stock con barra de progreso */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t("table.stock")}:</span>
                <span
                  className={cn(
                    "font-semibold",
                    isLowStock && "text-amber-600 dark:text-amber-400",
                    !isLowStock && "text-gray-900 dark:text-gray-50"
                  )}
                >
                  {product.stockCurrent}
                </span>
              </div>
              
              {/* Barra de progreso de stock */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isLowStock
                      ? "bg-amber-500 dark:bg-amber-600"
                      : stockPercentage >= 80
                      ? "bg-green-500 dark:bg-green-600"
                      : stockPercentage >= 50
                      ? "bg-blue-500 dark:bg-blue-600"
                      : "bg-yellow-500 dark:bg-yellow-600"
                  )}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t("table.min")}: {product.stockMin}</span>
                {product.stockMax && <span>Máx: {product.stockMax}</span>}
              </div>
            </div>

            {/* Información adicional */}
            <div className="mb-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {product.category && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t("table.category")}:</span>
                  <span>{product.category}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-medium">{t("table.location")}:</span>
                <span>{product.aisle} / {product.shelf}</span>
              </div>
              {product.costPrice > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Precio:</span>
                  <span>{formatCurrency(product.costPrice)}</span>
                </div>
              )}
              {product.isBatchTracked && (
                <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {t("products.batches")}
                </span>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="flex flex-1 items-center gap-1">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(product)}
                    title={t("actions.view")}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    title={t("actions.edit")}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Menú de acciones adicionales */}
              {(onDelete || onDuplicate || onHistory || onExport || onMovement || onToggleActive) && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActionMenuOpen(actionMenuOpen === product.id ? null : product.id)}
                    title="Más acciones"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {actionMenuOpen === product.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActionMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <div className="py-1">
                          {onMovement && (
                            <button
                              onClick={() => {
                                onMovement(product);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <MoreVertical className="h-4 w-4" />
                              {t("actions.movement")}
                            </button>
                          )}
                          {onDuplicate && (
                            <button
                              onClick={() => {
                                onDuplicate(product);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <Copy className="h-4 w-4" />
                              {t("actions.duplicate")}
                            </button>
                          )}
                          {onHistory && (
                            <button
                              onClick={() => {
                                onHistory(product);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <History className="h-4 w-4" />
                              {t("actions.history")}
                            </button>
                          )}
                          {onExport && (
                            <button
                              onClick={() => {
                                onExport(product);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <DownloadIcon className="h-4 w-4" />
                              {t("actions.export")}
                            </button>
                          )}
                          {onToggleActive && (
                            <button
                              onClick={() => {
                                onToggleActive(product);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              {product.isActive ? (
                                <>
                                  <AlertTriangle className="h-4 w-4" />
                                  {t("actions.deactivate")}
                                </>
                              ) : (
                                <>
                                  <Package className="h-4 w-4" />
                                  {t("actions.activate")}
                                </>
                              )}
                            </button>
                          )}
                          {onDelete && (
                            <>
                              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                              <button
                                onClick={() => {
                                  if (window.confirm(t("actions.confirmDelete") || `¿Estás seguro de eliminar ${product.name}?`)) {
                                    onDelete(product);
                                  }
                                  setActionMenuOpen(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("actions.delete")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

