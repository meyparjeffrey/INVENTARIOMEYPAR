import {
  AlertTriangle,
  Package,
  RefreshCw,
  Download,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@domain/entities";
import { Button } from "../components/ui/Button";
import { useLanguage } from "../context/LanguageContext";
import { useProducts } from "../hooks/useProducts";
import { cn } from "../lib/cn";

/**
 * Página de alarmas de stock bajo.
 * Muestra productos donde stock_current <= stock_min.
 */
export function AlarmsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { products, loading, refresh } = useProducts();

  // Filtrar solo productos en alarma
  const alarmedProducts = React.useMemo(() => {
    return products.filter((p) => p.stockCurrent <= p.stockMin && p.isActive);
  }, [products]);

  // Ordenar por criticidad (más bajo primero)
  const sortedProducts = React.useMemo(() => {
    return [...alarmedProducts].sort((a, b) => {
      const ratioA = a.stockMin > 0 ? a.stockCurrent / a.stockMin : 0;
      const ratioB = b.stockMin > 0 ? b.stockCurrent / b.stockMin : 0;
      return ratioA - ratioB;
    });
  }, [alarmedProducts]);

  const handleViewProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const getCriticalityLevel = (product: Product) => {
    if (product.stockCurrent === 0) return "critical";
    if (product.stockMin > 0 && product.stockCurrent / product.stockMin <= 0.5)
      return "high";
    return "medium";
  };

  const criticalityConfig = {
    critical: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      label: t("alarms.critical")
    },
    high: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      label: t("alarms.high")
    },
    medium: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-400",
      badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      label: t("alarms.medium")
    }
  };

  if (loading) {
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
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            {t("alarms.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {alarmedProducts.length} {t("alarms.productsInAlarm")}
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

      {/* Resumen de criticidad */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["critical", "high", "medium"] as const).map((level) => {
          const count = sortedProducts.filter(
            (p) => getCriticalityLevel(p) === level
          ).length;
          const config = criticalityConfig[level];

          return (
            <div
              key={level}
              className={cn(
                "rounded-lg border p-4",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", config.text)}>
                  {config.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-lg font-bold",
                    config.badge
                  )}
                >
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de productos */}
      {sortedProducts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Package className="mb-4 h-12 w-12 text-green-500" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-50">
            {t("alarms.noAlarms")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("alarms.allStockOk")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedProducts.map((product) => {
            const level = getCriticalityLevel(product);
            const config = criticalityConfig[level];
            const deficit = product.stockMin - product.stockCurrent;

            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      config.badge
                    )}
                  >
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        {product.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          config.badge
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{product.code}</span>
                      <span>·</span>
                      <span>
                        {product.aisle} / {product.shelf}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t("alarms.current")}:
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          product.stockCurrent === 0
                            ? "text-red-600 dark:text-red-400"
                            : config.text
                        )}
                      >
                        {product.stockCurrent}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("alarms.minimum")}:
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {product.stockMin}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className={cn("font-medium", config.text)}>
                        {t("alarms.need")} +{deficit}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProduct(product)}
                    className="gap-1"
                  >
                    {t("common.view")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

