import { AlertTriangle, Edit, Eye, MoreVertical, Package } from "lucide-react";
import * as React from "react";
import type { Product } from "@domain/entities";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onMovement?: (product: Product) => void;
}

/**
 * Tabla de productos con columnas, badges y acciones.
 */
export function ProductTable({
  products,
  loading = false,
  onView,
  onEdit,
  onMovement
}: ProductTableProps) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  const productsList = products ?? [];

  if (productsList.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Package className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">No hay productos</p>
        <p className="text-sm">Crea tu primer producto para comenzar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Código
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nombre
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Stock
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Mín
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ubicación
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Estado
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Acciones
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
                  "transition-colors",
                  isHovered && "bg-gray-50 dark:bg-gray-700/50"
                )}
                onMouseEnter={() => setHoveredRow(product.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50">
                  {product.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                  <div className="flex items-center gap-2">
                    <span>{product.name}</span>
                    {product.isBatchTracked && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Lotes
                      </span>
                    )}
                  </div>
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
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {isLowStock && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      Alarma
                    </span>
                  )}
                  {!isLowStock && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      OK
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {isHovered && (
                    <div className="flex items-center justify-center gap-1">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(product)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(product)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onMovement && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMovement(product)}
                          title="Registrar movimiento"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

