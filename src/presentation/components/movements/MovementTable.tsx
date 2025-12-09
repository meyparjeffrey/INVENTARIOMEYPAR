import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  ArrowRightLeft,
  Package,
  Calendar,
  User
} from "lucide-react";
import * as React from "react";
import type { InventoryMovement, MovementType, Product } from "@domain/entities";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

interface MovementWithProduct extends InventoryMovement {
  product?: Product;
  userFirstName?: string | null;
  userLastName?: string | null;
  productCode?: string | null;
  productName?: string | null;
}

interface MovementTableProps {
  movements: MovementWithProduct[];
  loading?: boolean;
  onViewProduct?: (productId: string) => void;
  onViewDetail?: (movement: MovementWithProduct) => void;
  emptyMessage?: string; // Mensaje personalizado cuando no hay movimientos
  emptyDescription?: string; // Descripción personalizada cuando no hay movimientos
}

const movementTypeConfig: Record<
  MovementType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  IN: {
    icon: ArrowDownCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  OUT: {
    icon: ArrowUpCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  ADJUSTMENT: {
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  TRANSFER: {
    icon: ArrowRightLeft,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  }
};

/**
 * Tabla de movimientos de inventario.
 */
export function MovementTable({
  movements,
  loading = false,
  onViewProduct,
  onViewDetail,
  emptyMessage,
  emptyDescription
}: MovementTableProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Package className="mb-4 h-12 w-12" />
        <p className="text-lg font-medium">{emptyMessage || t("movements.noMovements")}</p>
        <p className="text-sm">{emptyDescription || t("movements.createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.date")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.type")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.product")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.quantity")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.stockBefore")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.stockAfter")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.reason")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.category")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("movements.user")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {movements.map((movement) => {
              const config = movementTypeConfig[movement.movementType];
              const Icon = config.icon;
              const date = new Date(movement.movementDate);
              const userName = movement.userFirstName || movement.userLastName
                ? `${movement.userFirstName || ""} ${movement.userLastName || ""}`.trim()
                : null;

              return (
                <tr
                  key={movement.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => onViewDetail?.(movement)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {date.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        config.bgColor,
                        config.color
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(`movements.type.${movement.movementType}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {movement.product || movement.productName ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProduct?.(movement.productId);
                        }}
                        className="text-left hover:underline"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-50">
                          {movement.product?.name || movement.productName || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {movement.product?.code || movement.productCode || movement.productId.slice(0, 8)}
                        </div>
                      </button>
                    ) : (
                      <span className="text-gray-400">
                        {movement.productId.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <span
                      className={cn(
                        "font-bold",
                        movement.movementType === "IN"
                          ? "text-green-600 dark:text-green-400"
                          : movement.movementType === "OUT"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-gray-50"
                      )}
                    >
                      {movement.movementType === "IN" ? "+" : movement.movementType === "OUT" ? "-" : ""}
                      {movement.quantity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {movement.quantityBefore}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-50">
                    {movement.quantityAfter}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                    <div className="max-w-xs truncate" title={movement.requestReason}>
                      {movement.requestReason}
                    </div>
                    {movement.comments && (
                      <div
                        className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400"
                        title={movement.comments}
                      >
                        {movement.comments}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {movement.reasonCategory && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {t(`movements.category.${movement.reasonCategory}`)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-50">
                    {userName ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{userName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail?.(movement);
                      }}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {t("common.view")}
                    </button>
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

