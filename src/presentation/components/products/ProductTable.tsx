import { AlertTriangle, Edit, Eye, MoreVertical, Package, Trash2, Copy, History, Download as DownloadIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as React from "react";
import type { Product } from "@domain/entities";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { highlightText } from "../../utils/highlightText";

type SortField = "code" | "name" | "category" | "stockCurrent" | "stockMin" | "aisle" | "supplierCode";
type SortDirection = "asc" | "desc";

interface ProductTableProps {
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
 * Tabla de productos con columnas, badges y acciones.
 */
export function ProductTable({
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
}: ProductTableProps) {
  const { t } = useLanguage();
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");

  // Función para ordenar productos
  const sortedProducts = React.useMemo(() => {
    if (!sortField) return products;
    
    const sorted = [...products].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case "code":
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "category":
          aValue = (a.category || "").toLowerCase();
          bValue = (b.category || "").toLowerCase();
          break;
        case "stockCurrent":
          aValue = a.stockCurrent;
          bValue = b.stockCurrent;
          break;
        case "stockMin":
          aValue = a.stockMin;
          bValue = b.stockMin;
          break;
        case "aisle":
          aValue = a.aisle.toLowerCase();
          bValue = b.aisle.toLowerCase();
          break;
        case "supplierCode":
          aValue = (a.supplierCode || "").toLowerCase();
          bValue = (b.supplierCode || "").toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [products, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary-600 dark:text-primary-400" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary-600 dark:text-primary-400" />;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  const productsList = sortedProducts ?? [];

  if (productsList.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Package className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{t("products.noProducts")}</p>
        <p className="text-sm">{t("products.createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Scroll horizontal con indicadores */}
      <div 
        className="overflow-x-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#d1d5db #f3f4f6"
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            height: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f3f4f4;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .dark div::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .dark div::-webkit-scrollbar-thumb {
            background: #4b5563;
          }
          .dark div::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>
        <table className="w-full min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th 
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("code")}
            >
              <div className="flex items-center">
                {t("table.code")}
                <SortIcon field="code" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center">
                {t("table.name")}
                <SortIcon field="name" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("category")}
            >
              <div className="flex items-center">
                {t("table.category")}
                <SortIcon field="category" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("stockCurrent")}
            >
              <div className="flex items-center justify-end">
                {t("table.stock")}
                <SortIcon field="stockCurrent" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("stockMin")}
            >
              <div className="flex items-center justify-end">
                {t("table.min")}
                <SortIcon field="stockMin" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("aisle")}
            >
              <div className="flex items-center">
                {t("table.location")}
                <SortIcon field="aisle" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleSort("supplierCode")}
            >
              <div className="flex items-center">
                {t("table.supplierCode")}
                <SortIcon field="supplierCode" />
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("table.status")}
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {productsList.map((product) => {
            const isLowStock = product.stockCurrent <= product.stockMin;
            const isHovered = hoveredRow === product.id;

            return (
              <tr
                key={product.id}
                className={cn(
                  "transition-all duration-200",
                  isHovered && "bg-gray-50 dark:bg-gray-700/50 shadow-sm"
                )}
                onMouseEnter={() => setHoveredRow(product.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
                  {highlightText(product.code, searchTerm)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                  <div className="flex items-center gap-2">
                    <span>{highlightText(product.name, searchTerm)}</span>
                    {product.isBatchTracked && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {t("products.batches")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {product.category || (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                  <span
                    className={cn(
                      "font-medium",
                      isLowStock && "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {product.stockCurrent}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {product.stockMin}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {product.aisle} / {product.shelf}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {product.supplierCode ? (
                    <span className="max-w-xs truncate" title={product.supplierCode}>
                      {product.supplierCode}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {isLowStock && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      {t("products.alarm")}
                    </span>
                  )}
                  {!isLowStock && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      {t("products.ok")}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  <div className="relative flex items-center justify-center gap-1">
                    {/* Botones principales siempre visibles */}
                    <div className={cn(
                      "flex items-center gap-1 transition-opacity duration-200",
                      isHovered ? "opacity-100" : "opacity-70"
                    )}>
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(product)}
                          title={t("actions.view")}
                          className="transition-all duration-200 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                          className="transition-all duration-200 hover:scale-110 hover:bg-green-50 dark:hover:bg-green-900/20"
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
                          className={cn(
                            "transition-all duration-200",
                            isHovered ? "opacity-100" : "opacity-70",
                            "hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700"
                          )}
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

