import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Box,
  MapPin,
  DollarSign,
  Info,
  AlertTriangle,
  Edit,
  Layers,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/cn';
import type { Product } from '@domain/entities';

/**
 * Página de detalle de producto con información completa.
 */
export function ProductDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { authContext } = useAuth();
  const { getById, loading, error } = useProducts();
  const [product, setProduct] = React.useState<Product | null>(null);

  // Determinar la ruta de retorno según el estado de navegación
  const getBackPath = () => {
    const state = location.state as { from?: string } | null;
    if (state?.from === 'alarms') {
      return '/alerts';
    }
    return '/products';
  };

  React.useEffect(() => {
    if (id) {
      getById(id).then(setProduct);
    }
  }, [id, getById]);

  const canEdit = authContext?.permissions?.includes('products.edit') ?? false;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-50">
          {error || 'Producto no encontrado'}
        </p>
        <Button
          variant="secondary"
          onClick={() => navigate(getBackPath())}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  const isLowStock = product.stockCurrent <= product.stockMin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(getBackPath())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Código: {product.code}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => navigate(`/products/${product.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </motion.div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Información Básica */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Información Básica
            </h2>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Código
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                {product.code}
              </dd>
            </div>
            {product.barcode && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Código de Barras
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.barcode}
                </dd>
              </div>
            )}
            {product.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Descripción
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.description}
                </dd>
              </div>
            )}
            {product.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Categoría
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.category}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Estado
              </dt>
              <dd className="mt-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                    product.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
                  )}
                >
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {product.isBatchTracked && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Layers className="mr-1 h-3 w-3" />
                    Control por Lotes
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </motion.div>

        {/* Stock y Ubicación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <Box className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Stock y Ubicación
            </h2>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stock Actual
              </dt>
              <dd
                className={cn(
                  'mt-1 text-lg font-semibold',
                  isLowStock
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-900 dark:text-gray-50',
                )}
              >
                {product.stockCurrent} {product.unitOfMeasure || 'unidades'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stock Mínimo
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                {product.stockMin}
              </dd>
            </div>
            {product.stockMax && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Stock Máximo
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.stockMax}
                </dd>
              </div>
            )}
            {isLowStock && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Stock bajo: El stock actual está por debajo del mínimo
                  </span>
                </div>
              </div>
            )}
            <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Ubicación
                </dt>
              </div>
              <dd className="text-sm text-gray-900 dark:text-gray-50">
                Pasillo: {product.aisle} | Estante: {product.shelf}
                {product.locationExtra && ` | ${product.locationExtra}`}
              </dd>
            </div>
          </dl>
        </motion.div>

        {/* Precios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Precios
            </h2>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Precio de Coste
              </dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
                €{Number(product.costPrice).toFixed(2)}
              </dd>
            </div>
            {product.salePrice && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Precio de Venta
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
                  €{Number(product.salePrice).toFixed(2)}
                </dd>
              </div>
            )}
            {product.supplierCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Código de Proveedor
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.supplierCode}
                </dd>
              </div>
            )}
            {product.purchaseUrl && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  URL de Compra
                </dt>
                <dd className="mt-1">
                  <a
                    href={product.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {product.purchaseUrl}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </motion.div>

        {/* Información Adicional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              <Info className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Información Adicional
            </h2>
          </div>
          <dl className="space-y-3">
            {product.unitOfMeasure && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Unidad de Medida
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.unitOfMeasure}
                </dd>
              </div>
            )}
            {product.weightKg && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Peso
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.weightKg} kg
                </dd>
              </div>
            )}
            {product.dimensionsCm && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Dimensiones
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {product.dimensionsCm.length} × {product.dimensionsCm.width} ×{' '}
                  {product.dimensionsCm.height} cm
                </dd>
              </div>
            )}
            {product.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Notas
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                  {product.notes}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Creado
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                {new Date(product.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            {product.updatedAt && product.updatedAt !== product.createdAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Última actualización
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">
                  {new Date(product.updatedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            )}
          </dl>
        </motion.div>
      </div>

      {/* Imagen si existe */}
      {product.imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Imagen del Producto
          </h2>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-96 rounded-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
