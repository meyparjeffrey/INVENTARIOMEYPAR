import * as React from "react";
import type { Product } from "@domain/entities";
import { useLanguage } from "../../context/LanguageContext";
import { highlightText } from "../../utils/highlightText";
import { formatCurrency } from "../../utils/formatCurrency";
import { cn } from "../../lib/cn";
import { AlertTriangle } from "lucide-react";

interface ColumnRendererProps {
  product: Product;
  searchTerm: string;
  isLowStock: boolean;
}

/**
 * Renderizadores de columnas para la tabla de productos.
 */
export const columnRenderers: Record<string, (props: ColumnRendererProps) => React.ReactNode> = {
  code: ({ product, searchTerm }) => (
    <td key="code" className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
      {highlightText(product.code, searchTerm)}
    </td>
  ),
  name: ({ product, searchTerm }) => {
    const { t } = useLanguage();
    return (
      <td key="name" className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
        <div className="flex items-center gap-2">
          <span>{highlightText(product.name, searchTerm)}</span>
          {product.isBatchTracked && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {t("products.batches")}
            </span>
          )}
        </div>
      </td>
    );
  },
  category: ({ product }) => (
    <td key="category" className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      {product.category || <span className="text-gray-400 dark:text-gray-500">-</span>}
    </td>
  ),
  stockCurrent: ({ product, isLowStock }) => (
    <td key="stockCurrent" className="whitespace-nowrap px-4 py-3 text-right text-sm">
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "font-medium",
            isLowStock && "text-amber-600 dark:text-amber-400"
          )}
        >
          {product.stockCurrent}
        </span>
        {/* Barra de progreso de stock */}
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isLowStock
                ? "bg-amber-500 dark:bg-amber-600"
                : product.stockMax && product.stockCurrent / product.stockMax >= 0.8
                ? "bg-green-500 dark:bg-green-600"
                : product.stockMax && product.stockCurrent / product.stockMax >= 0.5
                ? "bg-blue-500 dark:bg-blue-600"
                : "bg-yellow-500 dark:bg-yellow-600"
            )}
            style={{
              width: product.stockMax
                ? `${Math.min((product.stockCurrent / product.stockMax) * 100, 100)}%`
                : product.stockCurrent > 0
                ? "100%"
                : "0%"
            }}
          />
        </div>
      </div>
    </td>
  ),
  stockMin: ({ product }) => (
    <td key="stockMin" className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
      {product.stockMin}
    </td>
  ),
  aisle: ({ product }) => (
    <td key="aisle" className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      {product.aisle} / {product.shelf}
    </td>
  ),
  supplierCode: ({ product }) => (
    <td key="supplierCode" className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      {product.supplierCode ? (
        <span className="max-w-xs truncate" title={product.supplierCode}>
          {product.supplierCode}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">-</span>
      )}
    </td>
  ),
  costPrice: ({ product }) => (
    <td key="costPrice" className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
      {formatCurrency(product.costPrice)}
    </td>
  ),
  salePrice: ({ product }) => (
    <td key="salePrice" className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
      {product.salePrice ? formatCurrency(product.salePrice) : (
        <span className="text-gray-400 dark:text-gray-500">-</span>
      )}
    </td>
  ),
  updatedAt: ({ product }) => (
    <td key="updatedAt" className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      {new Date(product.updatedAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })}
    </td>
  ),
  status: ({ isLowStock }) => {
    const { t } = useLanguage();
    return (
      <td key="status" className="whitespace-nowrap px-4 py-3 text-center text-sm">
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
    );
  }
};

