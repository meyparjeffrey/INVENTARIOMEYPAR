import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Package,
  X,
  Search,
} from 'lucide-react';
import * as React from 'react';
import type {
  MovementType,
  MovementReasonCategory,
  Product,
  UUID,
} from '@domain/entities';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Dialog } from '../ui/Dialog';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';

interface MovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    productId: UUID;
    movementType: MovementType;
    quantity: number;
    requestReason: string;
    reasonCategory?: MovementReasonCategory;
    comments?: string;
    referenceDocument?: string;
  }) => Promise<void>;
  products: Product[];
  preselectedProduct?: Product;
  preselectedMovementType?: MovementType;
}

const reasonCategories: { value: MovementReasonCategory; labelKey: string }[] = [
  { value: 'PURCHASE', labelKey: 'movements.category.PURCHASE' },
  { value: 'RETURN', labelKey: 'movements.category.RETURN' },
  { value: 'PRODUCTION', labelKey: 'movements.category.PRODUCTION' },
  { value: 'CONSUMPTION', labelKey: 'movements.category.CONSUMPTION' },
  { value: 'DEFECTIVE', labelKey: 'movements.category.DEFECTIVE' },
  { value: 'EXPIRED', labelKey: 'movements.category.EXPIRED' },
  { value: 'CORRECTION', labelKey: 'movements.category.CORRECTION' },
  { value: 'INVENTORY_COUNT', labelKey: 'movements.category.INVENTORY_COUNT' },
  { value: 'OTHER', labelKey: 'movements.category.OTHER' },
];

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
  const [reasonCategory, setReasonCategory] = React.useState<MovementReasonCategory | ''>(
    '',
  );
  const [comments, setComments] = React.useState('');
  const [referenceDocument, setReferenceDocument] = React.useState('');

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setMovementType(preselectedMovementType || 'OUT');
      setSelectedProduct(preselectedProduct || null);
      setProductSearch('');
      setQuantity('');
      setRequestReason('');
      setReasonCategory('');
      setComments('');
      setReferenceDocument('');
      setError(null);
    }
  }, [isOpen, preselectedProduct, preselectedMovementType]);

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

    if (!requestReason.trim()) {
      setError(t('movements.error.noReason'));
      return;
    }

    // Validar stock para salidas
    if (movementType === 'OUT' && qty > selectedProduct.stockCurrent) {
      setError(
        t('movements.error.insufficientStock').replace(
          '{current}',
          String(selectedProduct.stockCurrent),
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
        reasonCategory: reasonCategory || undefined,
        comments: comments.trim() || undefined,
        referenceDocument: referenceDocument.trim() || undefined,
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
                    {selectedProduct.code} · Stock: {selectedProduct.stockCurrent}
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
                              {product.code} · Stock: {product.stockCurrent}
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

        {/* Cantidad */}
        <div>
          <Label htmlFor="quantity">{t('movements.quantity')}</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="mt-2"
          />
          {selectedProduct && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('movements.availableStock')}: {selectedProduct.stockCurrent}
              </p>
              {quantity &&
                !isNaN(parseInt(quantity, 10)) &&
                parseInt(quantity, 10) > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('movements.stockBefore')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        {selectedProduct.stockCurrent}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('movements.stockAfter')}:
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
                          ? selectedProduct.stockCurrent + parseInt(quantity, 10)
                          : movementType === 'OUT'
                            ? Math.max(
                                0,
                                selectedProduct.stockCurrent - parseInt(quantity, 10),
                              )
                            : selectedProduct.stockCurrent}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Categoría de razón */}
        <div>
          <Label htmlFor="reasonCategory">{t('movements.category')}</Label>
          <select
            id="reasonCategory"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value as MovementReasonCategory)}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
          >
            <option value="">{t('movements.selectCategory')}</option>
            {reasonCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {t(cat.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Motivo */}
        <div>
          <Label htmlFor="requestReason">{t('movements.reason')} *</Label>
          <Input
            id="requestReason"
            type="text"
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder={t('movements.reasonPlaceholder')}
            className="mt-2"
          />
        </div>

        {/* Documento de Referencia */}
        <div>
          <Label htmlFor="referenceDocument">{t('movements.referenceDocument')}</Label>
          <Input
            id="referenceDocument"
            type="text"
            value={referenceDocument}
            onChange={(e) => setReferenceDocument(e.target.value)}
            placeholder={t('movements.referenceDocument')}
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
