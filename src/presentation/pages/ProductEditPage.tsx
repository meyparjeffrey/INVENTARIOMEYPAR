import { motion } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { ProductForm } from '../components/products/ProductForm';
import type {
  UpdateProductInput,
  CreateProductInput,
} from '@domain/repositories/ProductRepository';
import type { Product } from '@domain/entities';

/**
 * Página moderna e interactiva para editar un producto existente.
 */
export function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { authContext } = useAuth();
  const { getById, update, loading } = useProducts();
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = React.useState(true);

  // Solo ADMIN puede editar el código del producto
  const canEditCode = authContext?.profile?.role === 'ADMIN';

  React.useEffect(() => {
    if (id) {
      getById(id)
        .then((p) => {
          if (p) {
            setProduct(p);
          } else {
            navigate('/products');
          }
        })
        .catch(() => {
          navigate('/products');
        })
        .finally(() => {
          setLoadingProduct(false);
        });
    }
  }, [id, getById, navigate]);

  const handleSubmit = React.useCallback(
    async (data: UpdateProductInput | CreateProductInput) => {
      if (!id) return;

      // Obtener el usuario actual desde Supabase
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (authError || !user?.id) {
        throw new Error('No hay usuario autenticado');
      }

      const updateData: UpdateProductInput = {
        ...data,
        updatedBy: user.id,
      };

      await update(id, updateData);
      // Navegar con state para forzar recarga en ProductDetailPage
      navigate(`/products/${id}`, {
        state: { refresh: true },
        replace: false,
      });
    },
    [id, update, navigate],
  );

  const handleCancel = React.useCallback(() => {
    if (id) {
      navigate(`/products/${id}`);
    } else {
      navigate('/products');
    }
  }, [id, navigate]);

  if (loadingProduct) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-r-transparent" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header animado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-purple-50/30 p-8 shadow-lg dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-purple-900/20"
      >
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent opacity-0 transition-opacity duration-1000 hover:opacity-100" />

        <div className="relative flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30"
          >
            <Package className="h-8 w-8 text-white" />
          </motion.div>

          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-gray-50"
            >
              Editar Producto
              <Sparkles className="h-6 w-6 text-purple-500" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Modifica la información del producto. Los campos marcados con{' '}
              <span className="font-semibold text-red-500">*</span> son obligatorios.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Formulario */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          canEditCode={canEditCode}
        />
      </motion.div>
    </div>
  );
}
