import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Package,
  X,
  Search,
} from 'lucide-react';
import * as React from 'react';
import type { MovementType, Product, UUID } from '@domain/entities';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Dialog } from '../ui/Dialog';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';

interface MovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    productId: UUID;
    movementType: MovementType;
    quantity: number;
    requestReason: string;
    comments?: string;
    warehouse?: 'MEYPAR' | 'OLIVA_TORRAS';
  }) => Promise<void>;
  products: Product[];
  preselectedProduct?: Product;
  preselectedMovementType?: MovementType;
}

/**
 * Formulario modal para registrar un nuevo movimiento.
 *
 * Permite crear movimientos de tipo IN (entrada), OUT (salida) o ADJUSTMENT (ajuste).
 * Incluye validaciones de stock, preview de stock antes/después, y campos opcionales
 * como categoría de motivo, documento de referencia y comentarios.
 *
 * @component
 * @param {MovementFormProps} props - Propiedades del componente
 * @param {boolean} props.isOpen - Estado de apertura del modal
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {Function} props.onSubmit - Callback al enviar el formulario
 * @param {Product[]} props.products - Lista de productos disponibles
 * @param {Product} [props.preselectedProduct] - Producto preseleccionado (opcional)
 * @param {MovementType} [props.preselectedMovementType] - Tipo de movimiento preseleccionado (opcional)
 * @example
 * <MovementForm
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSubmit={handleSubmit}
 *   products={products}
 *   preselectedMovementType="IN"
 * />
 */
export function MovementForm({
  isOpen,
  onClose,
  onSubmit,
  products,
  preselectedProduct,
  preselectedMovementType,
}: MovementFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const repositoryRef = React.useRef(new SupabaseProductRepository(supabaseClient));

  // Form state
  const [movementType, setMovementType] = React.useState<MovementType>(
    preselectedMovementType || 'OUT',
  );
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    preselectedProduct || null,
  );
  const [productSearch, setProductSearch] = React.useState('');
  const [showProductList, setShowProductList] = React.useState(false);
  const [quantity, setQuantity] = React.useState('');
  const [requestReason, setRequestReason] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [warehouse, setWarehouse] = React.useState<'MEYPAR' | 'OLIVA_TORRAS'>('MEYPAR');
  const [productStocksByWarehouse, setProductStocksByWarehouse] = React.useState<
    Array<{ warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; quantity: number }>
  >([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setMovementType(preselectedMovementType || 'OUT');
      setSelectedProduct(preselectedProduct || null);
      setProductSearch('');
      setQuantity('');
      setRequestReason('');
      setComments('');
      setWarehouse('MEYPAR');
      setProductStocksByWarehouse([]);
      setError(null);
    }
  }, [isOpen, preselectedProduct, preselectedMovementType]);

  // Cargar ubicaciones cuando se selecciona un producto para calcular stock por almacén
  React.useEffect(() => {
    if (selectedProduct?.id) {
      repositoryRef.current
        .getProductLocations(selectedProduct.id)
        .then((locations) => {
          // Calcular stock por almacén desde las ubicaciones
          const stocksByWarehouse: Array<{
            warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
            quantity: number;
          }> = [];

          // MEYPAR: sumar todas las ubicaciones de MEYPAR
          const meyparStock = locations
            .filter((loc) => loc.warehouse === 'MEYPAR')
            .reduce((sum, loc) => sum + (loc.quantity ?? 0), 0);
          if (meyparStock > 0 || locations.some((loc) => loc.warehouse === 'MEYPAR')) {
            stocksByWarehouse.push({ warehouse: 'MEYPAR', quantity: meyparStock });
          }

          // OLIVA_TORRAS: sumar todas las ubicaciones de OLIVA_TORRAS
          const olivaStock = locations
            .filter((loc) => loc.warehouse === 'OLIVA_TORRAS')
            .reduce((sum, loc) => sum + (loc.quantity ?? 0), 0);
          if (
            olivaStock > 0 ||
            locations.some((loc) => loc.warehouse === 'OLIVA_TORRAS')
          ) {
            stocksByWarehouse.push({ warehouse: 'OLIVA_TORRAS', quantity: olivaStock });
          }

          // FURGONETA: sumar todas las ubicaciones de FURGONETA
          const furgonetaStock = locations
            .filter((loc) => loc.warehouse === 'FURGONETA')
            .reduce((sum, loc) => sum + (loc.quantity ?? 0), 0);
          if (
            furgonetaStock > 0 ||
            locations.some((loc) => loc.warehouse === 'FURGONETA')
          ) {
            stocksByWarehouse.push({ warehouse: 'FURGONETA', quantity: furgonetaStock });
          }

          setProductStocksByWarehouse(stocksByWarehouse);
        })
        .catch((err) => {
          console.warn('Error al cargar ubicaciones del producto:', err);
          setProductStocksByWarehouse([]);
        });
    } else {
      setProductStocksByWarehouse([]);
    }
  }, [selectedProduct?.id]);

  // Filtrar productos por búsqueda
  const filteredProducts = React.useMemo(() => {
    // Sin límite: mostrar todos los productos disponibles
    if (!productSearch) return products;
    const search = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search),
    );
  }, [products, productSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!selectedProduct) {
      setError(t('movements.error.noProduct'));
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError(t('movements.error.invalidQuantity'));
      return;
    }

    // Personal ya no es obligatorio

    // Validar stock para salidas (usar stock del almacén específico)
    const currentStockInWarehouse =
      productStocksByWarehouse.find((s) => s.warehouse === warehouse)?.quantity ?? 0;
    if (movementType === 'OUT' && qty > currentStockInWarehouse) {
      setError(
        t('movements.error.insufficientStock').replace(
          '{current}',
          String(currentStockInWarehouse),
        ),
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        productId: selectedProduct.id,
        movementType,
        quantity: qty,
        requestReason: requestReason.trim(),
        comments: comments.trim() || undefined,
        warehouse,
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al registrar movimiento';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('movements.new')}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo de movimiento */}
        <div>
          <Label>{t('movements.type')}</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('IN')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                movementType === 'IN'
                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
              )}
            >
              <ArrowDownCircle className="h-6 w-6" />
              <span className="text-sm font-medium">{t('movements.type.IN')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementType('OUT')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                movementType === 'OUT'
                  ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
              )}
            >
              <ArrowUpCircle className="h-6 w-6" />
              <span className="text-sm font-medium">{t('movements.type.OUT')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMovementType('ADJUSTMENT')}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                movementType === 'ADJUSTMENT'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
              )}
            >
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm font-medium">
                {t('movements.type.ADJUSTMENT')}
              </span>
            </button>
          </div>
        </div>

        {/* Selector de producto */}
        <div className="relative">
          <Label>{t('movements.product')}</Label>
          {selectedProduct ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-50">
                    {selectedProduct.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedProduct.code} · Stock total: {selectedProduct.stockCurrent}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder={t('movements.searchProduct')}
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductList(true);
                }}
                onFocus={() => setShowProductList(true)}
                className="pl-10"
              />
              {showProductList && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProductList(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-500">
                        {t('common.noResults')}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setProductSearch('');
                            setShowProductList(false);
                          }}
                          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Package className="h-6 w-6 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-50">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {product.code} · Stock total: {product.stockCurrent}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Selector de almacén */}
        {selectedProduct && (
          <div>
            <Label>{t('movements.warehouse') || 'Almacén'}</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWarehouse('MEYPAR')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                  warehouse === 'MEYPAR'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                )}
              >
                <span className="text-sm font-medium">
                  {t('form.warehouse.meypar') || 'MEYPAR'}
                </span>
                {productStocksByWarehouse.find((s) => s.warehouse === 'MEYPAR') && (
                  <span className="text-xs text-gray-500">
                    (
                    {productStocksByWarehouse.find((s) => s.warehouse === 'MEYPAR')
                      ?.quantity ?? 0}
                    )
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setWarehouse('OLIVA_TORRAS')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                  warehouse === 'OLIVA_TORRAS'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                )}
              >
                <span className="text-sm font-medium">
                  {t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                </span>
                {productStocksByWarehouse.find((s) => s.warehouse === 'OLIVA_TORRAS') && (
                  <span className="text-xs text-gray-500">
                    (
                    {productStocksByWarehouse.find((s) => s.warehouse === 'OLIVA_TORRAS')
                      ?.quantity ?? 0}
                    )
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div>
          <Label htmlFor="quantity">{t('movements.quantity')}</Label>
          <Input
            id="quantity"
            // Evitar que el navegador "autocorrija" a 1 al perder el foco en algunos casos.
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={quantity}
            onChange={(e) => {
              const raw = e.target.value;
              // Permitir vacío y dígitos únicamente
              const cleaned = raw.replace(/[^\d]/g, '');
              setQuantity(cleaned);
            }}
            placeholder="0"
            className="mt-2"
          />
          {selectedProduct && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('movements.availableStock')} (
                {warehouse === 'MEYPAR'
                  ? t('form.warehouse.meypar') || 'MEYPAR'
                  : t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                ):{' '}
                {productStocksByWarehouse.find((s) => s.warehouse === warehouse)
                  ?.quantity ?? 0}
              </p>
              {quantity &&
                !isNaN(parseInt(quantity, 10)) &&
                parseInt(quantity, 10) > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('movements.stockBefore')} (
                        {warehouse === 'MEYPAR'
                          ? t('form.warehouse.meypar') || 'MEYPAR'
                          : t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                        ):
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        {productStocksByWarehouse.find((s) => s.warehouse === warehouse)
                          ?.quantity ?? 0}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('movements.stockAfter')} (
                        {warehouse === 'MEYPAR'
                          ? t('form.warehouse.meypar') || 'MEYPAR'
                          : t('form.warehouse.olivaTorras') || 'Oliva Torras'}
                        ):
                      </span>
                      <span
                        className={cn(
                          'font-bold',
                          movementType === 'IN'
                            ? 'text-green-600 dark:text-green-400'
                            : movementType === 'OUT'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400',
                        )}
                      >
                        {movementType === 'IN'
                          ? (productStocksByWarehouse.find(
                              (s) => s.warehouse === warehouse,
                            )?.quantity ?? 0) + parseInt(quantity, 10)
                          : movementType === 'OUT'
                            ? Math.max(
                                0,
                                (productStocksByWarehouse.find(
                                  (s) => s.warehouse === warehouse,
                                )?.quantity ?? 0) - parseInt(quantity, 10),
                              )
                            : (productStocksByWarehouse.find(
                                (s) => s.warehouse === warehouse,
                              )?.quantity ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Personal */}
        <div>
          <Label htmlFor="requestReason">{t('movements.person')}</Label>
          <Input
            id="requestReason"
            type="text"
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder={t('movements.personPlaceholder')}
            className="mt-2"
          />
        </div>

        {/* Comentarios */}
        <div>
          <Label htmlFor="comments">{t('movements.comments')}</Label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t('movements.commentsPlaceholder')}
            rows={2}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? t('common.saving') : t('movements.register')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
