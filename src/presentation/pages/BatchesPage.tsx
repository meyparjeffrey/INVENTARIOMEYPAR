import {
  Boxes,
  RefreshCw,
  Filter,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ArrowRight
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { BatchStatus, ProductBatch, Product } from "@domain/entities";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { useLanguage } from "../context/LanguageContext";
import { useBatches } from "../hooks/useBatches";
import { cn } from "../lib/cn";

interface BatchWithProduct extends ProductBatch {
  product?: Product;
}

const statusConfig: Record<
  BatchStatus,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  OK: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  DEFECTIVE: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30"
  },
  BLOCKED: {
    icon: XCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-700"
  },
  CONSUMED: {
    icon: CheckCircle,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  EXPIRED: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  }
};

/**
 * Página de gestión de lotes.
 */
export function BatchesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState<BatchStatus | "">("");
  const [selectedBatch, setSelectedBatch] = React.useState<BatchWithProduct | null>(null);
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<BatchStatus>("OK");
  const [statusReason, setStatusReason] = React.useState("");

  const {
    batches,
    loading,
    error,
    totalCount,
    page,
    totalPages,
    filters,
    setFilters,
    setPage,
    refresh,
    updateBatchStatus
  } = useBatches();

  // Aplicar filtro de estado
  React.useEffect(() => {
    if (statusFilter) {
      setFilters({ ...filters, status: statusFilter });
    } else {
      const { status, ...rest } = filters;
      setFilters(rest);
    }
  }, [statusFilter]);

  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  const handleChangeStatus = async () => {
    if (!selectedBatch) return;

    try {
      await updateBatchStatus(
        selectedBatch.id,
        newStatus,
        statusReason || undefined
      );
      setShowStatusDialog(false);
      setSelectedBatch(null);
      setStatusReason("");
    } catch {
      // Error ya manejado en el hook
    }
  };

  const openStatusDialog = (batch: BatchWithProduct) => {
    setSelectedBatch(batch);
    setNewStatus(batch.status);
    setStatusReason("");
    setShowStatusDialog(true);
  };

  if (loading && batches.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            <Boxes className="h-7 w-7 text-primary-600" />
            {t("batches.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount} {t("batches.total")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "primary" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          {t("filters.all")}
        </Button>
        {(Object.keys(statusConfig) as BatchStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="gap-1.5"
            >
              <Icon className="h-4 w-4" />
              {t(`batches.status.${status}`)}
            </Button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Lista de lotes */}
      {batches.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Boxes className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-50">
            {t("batches.noBatches")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("batches.noBatchesDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.code")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.product")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.status")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.quantityTotal")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.quantityAvailable")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.receivedAt")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("batches.expiryDate")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {batches.map((batch) => {
                  const config = statusConfig[batch.status];
                  const Icon = config.icon;
                  const isExpiringSoon =
                    batch.expiryDate &&
                    new Date(batch.expiryDate) <
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr
                      key={batch.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-50">
                          {batch.batchCode}
                        </div>
                        {batch.batchBarcode && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {batch.batchBarcode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {batch.product ? (
                          <button
                            onClick={() => handleViewProduct(batch.productId)}
                            className="text-left hover:underline"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-50">
                              {batch.product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {batch.product.code}
                            </div>
                          </button>
                        ) : (
                          <span className="text-gray-400">
                            {batch.productId.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                        <button
                          onClick={() => openStatusDialog(batch)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1",
                            config.bgColor,
                            config.color
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t(`batches.status.${batch.status}`)}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-50">
                        {batch.quantityTotal}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <span
                          className={cn(
                            "font-medium",
                            batch.quantityAvailable === 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-900 dark:text-gray-50"
                          )}
                        >
                          {batch.quantityAvailable}
                        </span>
                        {batch.defectiveQty > 0 && (
                          <span className="ml-1 text-xs text-red-500">
                            (-{batch.defectiveQty})
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(batch.receivedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {batch.expiryDate ? (
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              isExpiringSoon
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {isExpiringSoon && (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            {new Date(batch.expiryDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProduct(batch.productId)}
                          className="gap-1"
                        >
                          {t("common.view")}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Dialog para cambiar estado */}
      <Dialog
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        title={t("batches.changeStatus")}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("batches.newStatus")}
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as BatchStatus)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
            >
              {(Object.keys(statusConfig) as BatchStatus[]).map((status) => (
                <option key={status} value={status}>
                  {t(`batches.status.${status}`)}
                </option>
              ))}
            </select>
          </div>

          {(newStatus === "BLOCKED" || newStatus === "DEFECTIVE") && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("batches.reason")}
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={t("batches.reasonPlaceholder")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleChangeStatus}
              className="flex-1"
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

