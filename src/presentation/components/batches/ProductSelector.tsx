import { Search, Package, Check } from "lucide-react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@domain/entities";
import { Input } from "../ui/Input";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { useProducts } from "../../hooks/useProducts";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

interface ProductSelectorProps {
  value?: string;
  onChange: (productId: string) => void;
  onProductSelect?: (product: Product) => void;
  className?: string;
  placeholder?: string;
  filterActive?: boolean;
  filterBatchTracked?: boolean;
}

/**
 * Selector de productos con búsqueda avanzada similar al buscador global.
 */
export function ProductSelector({
  value,
  onChange,
  onProductSelect,
  className,
  placeholder,
  filterActive = true,
  filterBatchTracked = true
}: ProductSelectorProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout>();

  // Cargar producto seleccionado si hay value
  React.useEffect(() => {
    if (value) {
      loadSelectedProduct(value);
    } else {
      setSelectedProduct(null);
    }
  }, [value]);

  const loadSelectedProduct = async (productId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (!error && data) {
        const product: Product = {
          id: data.id,
          code: data.code,
          barcode: data.barcode,
          name: data.name,
          description: data.description,
          category: data.category,
          stockCurrent: data.stock_current,
          stockMin: data.stock_min,
          stockMax: data.stock_max,
          aisle: data.aisle,
          shelf: data.shelf,
          locationExtra: data.location_extra,
          costPrice: data.cost_price,
          salePrice: data.sale_price,
          purchaseUrl: data.purchase_url,
          imageUrl: data.image_url,
          supplierCode: data.supplier_code,
          isActive: data.is_active,
          isBatchTracked: data.is_batch_tracked,
          unitOfMeasure: data.unit_of_measure,
          weightKg: data.weight_kg,
          dimensionsCm: data.dimensions_cm,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        setSelectedProduct(product);
      }
    } catch (err) {
      // Error al cargar producto
    }
  };

  // Buscar productos en Supabase (igual que GlobalSearch del header)
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Igual que GlobalSearch: solo buscar si hay al menos 2 caracteres
    if (searchTerm.length < 2) {
      setFilteredProducts([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const term = `%${searchTerm}%`;
        
        // Buscar productos (exactamente como GlobalSearch - línea por línea igual)
        const { data: productsData, error } = await supabaseClient
          .from("products")
          .select("*")
          .or(`code.ilike.${term},name.ilike.${term},barcode.ilike.${term}`)
          .eq("is_active", filterActive !== false)
          .limit(50);

        // Filtrar por control de lotes en el cliente (si es necesario)
        let filteredData = productsData;
        if (filterBatchTracked && productsData) {
          filteredData = productsData.filter((p: any) => p.is_batch_tracked === true);
        }

        // Abrir dropdown si hay resultados
        if (filteredData && filteredData.length > 0) {
          setIsOpen(true);
        }

        if (error) {
          // eslint-disable-next-line no-console
          console.error("❌ Error buscando productos:", error);
          setFilteredProducts([]);
        } else if (filteredData && filteredData.length > 0) {
          const products: Product[] = filteredData.map((row: any) => ({
            id: row.id,
            code: row.code,
            barcode: row.barcode,
            name: row.name,
            description: row.description,
            category: row.category,
            stockCurrent: row.stock_current,
            stockMin: row.stock_min,
            stockMax: row.stock_max,
            aisle: row.aisle,
            shelf: row.shelf,
            locationExtra: row.location_extra,
            costPrice: row.cost_price,
            salePrice: row.sale_price,
            purchaseUrl: row.purchase_url,
            imageUrl: row.image_url,
            supplierCode: row.supplier_code,
            isActive: row.is_active,
            isBatchTracked: row.is_batch_tracked,
            unitOfMeasure: row.unit_of_measure,
            weightKg: row.weight_kg,
            dimensionsCm: row.dimensions_cm,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          setFilteredProducts(products);
        } else {
          setFilteredProducts([]);
          setIsOpen(false);
        }
      } catch (err) {
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, filterActive, filterBatchTracked]);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    onChange(product.id);
    if (onProductSelect) {
      onProductSelect(product);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    setSelectedProduct(null);
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
  };

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {selectedProduct ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-50">
              {selectedProduct.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedProduct.code}
              {selectedProduct.barcode && ` • ${selectedProduct.barcode}`}
            </div>
            {selectedProduct.description && (
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {selectedProduct.description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
            title={t("common.clear") || "Limpiar"}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder || (t("batches.form.selectProduct") || "Buscar producto...")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>
      )}

      <AnimatePresence>
        {isOpen && !selectedProduct && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-r-transparent" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm.trim() ? (
                    <>
                      {t("batches.form.noProductsFound") || "No se encontraron productos"}
                      <br />
                      <span className="text-xs">
                        {t("batches.form.tryDifferentSearch") || "Intenta con otro término de búsqueda"}
                      </span>
                    </>
                  ) : (
                    t("batches.form.startTyping") || "Comienza a escribir para buscar productos"
                  )}
                </div>
              ) : (
                <div className="py-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-50">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.code}
                          {product.barcode && ` • ${product.barcode}`}
                        </div>
                        {product.description && (
                          <div className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
                            {product.description}
                          </div>
                        )}
                        <div className="mt-1 flex gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("products.stock") || "Stock"}: {product.stockCurrent}
                          </span>
                          {product.category && (
                            <span className="text-gray-500 dark:text-gray-400">
                              • {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                      {value === product.id && (
                        <Check className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

