import {
  ScanLine,
  Package,
  Boxes,
  ArrowUpDown,
  Search,
  Camera,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { Product } from "@domain/entities";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useLanguage } from "../context/LanguageContext";
import { useProducts } from "../hooks/useProducts";
import { cn } from "../lib/cn";
import { highlightText } from "../utils/highlightText";

type ScanMode = "search" | "movement";

interface ScanResult {
  type: "product" | "batch" | "not_found";
  product?: Product;
  batchCode?: string;
}

/**
 * Página de escáner para búsqueda rápida de productos.
 * Soporta escáner USB (modo teclado) con foco permanente.
 */
export function ScannerPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { products } = useProducts();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = React.useState<ScanMode>("search");
  const [scanValue, setScanValue] = React.useState("");
  const [lastScan, setLastScan] = React.useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = React.useState<ScanResult[]>([]);

  // Mantener foco en el input
  React.useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    focusInput();

    // Re-enfocar cada segundo si perdemos el foco
    const interval = setInterval(focusInput, 1000);

    // También re-enfocar cuando la ventana recupera el foco
    window.addEventListener("focus", focusInput);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", focusInput);
    };
  }, []);

  // Procesar escaneo cuando se presiona Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && scanValue.trim()) {
      processBarcode(scanValue.trim());
      setScanValue("");
    }
  };

  const processBarcode = (barcode: string) => {
    // Buscar primero por barcode de producto
    const productByBarcode = products.find(
      (p) => p.barcode?.toLowerCase() === barcode.toLowerCase()
    );

    if (productByBarcode) {
      const result: ScanResult = { type: "product", product: productByBarcode };
      setLastScan(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 9)]);

      // Si estamos en modo búsqueda, ir al producto
      if (mode === "search") {
        navigate(`/products/${productByBarcode.id}`);
      }
      return;
    }

    // Buscar por código de producto
    const productByCode = products.find(
      (p) => p.code.toLowerCase() === barcode.toLowerCase()
    );

    if (productByCode) {
      const result: ScanResult = { type: "product", product: productByCode };
      setLastScan(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 9)]);

      if (mode === "search") {
        navigate(`/products/${productByCode.id}`);
      }
      return;
    }

    // TODO: Buscar por batch_barcode cuando se implemente

    // No encontrado
    const result: ScanResult = { type: "not_found" };
    setLastScan(result);
    setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
  };

  const handleManualSearch = () => {
    if (scanValue.trim()) {
      processBarcode(scanValue.trim());
      setScanValue("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          <ScanLine className="h-7 w-7 text-primary-600" />
          {t("scanner.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("scanner.subtitle")}
        </p>
      </div>

      {/* Selector de modo */}
      <div className="flex justify-center gap-2">
        <Button
          variant={mode === "search" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("search")}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          {t("scanner.mode.search")}
        </Button>
        <Button
          variant={mode === "movement" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("movement")}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {t("scanner.mode.movement")}
        </Button>
      </div>

      {/* Campo de escaneo principal */}
      <div className="rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 p-8 dark:border-primary-700 dark:bg-primary-900/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ScanLine className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-primary-500" />
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("scanner.placeholder")}
              className="h-16 w-96 rounded-xl border-2 border-primary-300 bg-white pl-14 pr-4 text-xl font-medium text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-primary-700 dark:bg-gray-800 dark:text-gray-50"
              autoComplete="off"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("scanner.instructions")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSearch}
            disabled={!scanValue.trim()}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            {t("scanner.manualSearch")}
          </Button>
        </div>
      </div>

      {/* Resultado del último escaneo */}
      {lastScan && (
        <div
          className={cn(
            "rounded-lg border p-4",
            lastScan.type === "not_found"
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
              : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          )}
        >
          <div className="flex items-center gap-4">
            {lastScan.type === "not_found" ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {t("scanner.notFound")}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    {t("scanner.notFoundDesc")}
                  </p>
                </div>
              </>
            ) : lastScan.product ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {t("scanner.found")}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {highlightText(lastScan.product.name, scanValue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {highlightText(lastScan.product.code, scanValue)} · Stock: {lastScan.product.stockCurrent}
                    {lastScan.product.stockCurrent <= lastScan.product.stockMin && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {t("products.alarm")}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/products/${lastScan.product!.id}`)}
                >
                  {t("actions.view")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Historial de escaneos */}
      {scanHistory.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-50">
              {t("scanner.history")}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {scanHistory.slice(0, 5).map((scan, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3"
              >
                {scan.type === "not_found" ? (
                  <>
                    <X className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t("scanner.notFound")}
                    </span>
                  </>
                ) : scan.product ? (
                  <>
                    <Package className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        {highlightText(scan.product.name, scanValue)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {highlightText(scan.product.code, scanValue)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/products/${scan.product!.id}`)}
                    >
                      {t("common.view")}
                    </Button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-50">
          {t("scanner.howToUse")}
        </h3>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>• {t("scanner.tip1")}</li>
          <li>• {t("scanner.tip2")}</li>
          <li>• {t("scanner.tip3")}</li>
        </ul>
      </div>
    </div>
  );
}

