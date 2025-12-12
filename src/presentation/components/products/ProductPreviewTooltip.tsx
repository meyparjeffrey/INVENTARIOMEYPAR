import * as React from 'react';
import {
  Package,
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Barcode,
} from 'lucide-react';
import type { Product } from '@domain/entities';
import { cn } from '../../lib/cn';
import { formatCurrency } from '../../utils/formatCurrency';
import { useLanguage } from '../../context/LanguageContext';

interface ProductPreviewTooltipProps {
  product: Product;
  children: React.ReactNode;
}

/**
 * Tooltip que muestra información rápida del producto al hacer hover.
 */
export function ProductPreviewTooltip({ product, children }: ProductPreviewTooltipProps) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const timeoutRef = React.useRef<Timeout>();

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    }, 500); // Delay de 500ms antes de mostrar
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isVisible) {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isLowStock = product.stockCurrent <= product.stockMin;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="relative"
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'fixed z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800',
            'animate-in fade-in-0 zoom-in-95 duration-200',
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(10px, 10px)',
          }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {product.name}
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {product.code}
                </p>
              </div>
              {isLowStock && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            </div>

            {/* Información principal */}
            <div className="space-y-2">
              {/* Stock */}
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {t('table.stock')}:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      isLowStock && 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {product.stockCurrent}
                  </span>
                  {product.stockMin > 0 && (
                    <span className="text-gray-400 dark:text-gray-500">
                      {' / '}
                      {t('table.min')}: {product.stockMin}
                    </span>
                  )}
                </span>
              </div>

              {/* Precios */}
              {(product.costPrice > 0 || product.salePrice) && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {product.costPrice > 0 && (
                      <>
                        {t('products.price.cost')}: {formatCurrency(product.costPrice)}
                      </>
                    )}
                    {product.salePrice && (
                      <>
                        {product.costPrice > 0 && ' • '}
                        {t('products.price.sale')}: {formatCurrency(product.salePrice)}
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Ubicaciones - Mostrar todas las ubicaciones reales con almacén */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                <div className="flex-1 space-y-1">
                  {product.locations && Array.isArray(product.locations) && product.locations.length > 0 ? (
                    product.locations.map((loc, index) => (
                      <div key={loc.id || index} className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-300">
                          {loc.warehouse === 'MEYPAR' && `MEYPAR: ${loc.aisle}${loc.shelf.toUpperCase()}`}
                          {loc.warehouse === 'FURGONETA' && `Furgoneta: ${loc.shelf}`}
                          {loc.warehouse === 'OLIVA_TORRAS' && (t('form.warehouse.olivaTorras') || 'Oliva Torras')}
                        </span>
                        {loc.isPrimary && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({t('form.primary') || 'Principal'})
                          </span>
                        )}
                      </div>
                    ))
                  ) : product.aisle && product.shelf ? (
                    <span className="text-gray-600 dark:text-gray-300">
                      {product.warehouse === 'MEYPAR' 
                        ? `MEYPAR: ${product.aisle}${product.shelf}`
                        : product.warehouse === 'FURGONETA'
                          ? `Furgoneta: ${product.locationExtra || product.shelf}`
                          : product.warehouse === 'OLIVA_TORRAS'
                            ? (t('form.warehouse.olivaTorras') || 'Oliva Torras')
                            : `${product.aisle}${product.shelf}`}
                    </span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300">-</span>
                  )}
                </div>
              </div>

              {/* Categoría */}
              {product.category && (
                <div className="flex items-center gap-2 text-sm">
                  <Barcode className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {product.category}
                  </span>
                </div>
              )}

              {/* Última actualización */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>
                  {t('products.lastUpdate')}:{' '}
                  {new Date(product.updatedAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              {product.isBatchTracked && (
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {t('products.batches')}
                </span>
              )}
              {!product.isActive && (
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {t('products.inactive')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
