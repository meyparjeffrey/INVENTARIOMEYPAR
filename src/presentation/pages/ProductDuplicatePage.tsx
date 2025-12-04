import { ArrowLeft, Copy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { ProductForm } from "../components/products/ProductForm";
import { Button } from "../components/ui/Button";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import type { CreateProductInput } from "@domain/repositories/ProductRepository";

/**
 * Página para duplicar un producto existente.
 * Pre-llena todos los campos con los datos del producto original,
 * pero permite modificar el código para que sea único.
 */
export function ProductDuplicatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const { getById, create } = useProducts();
  const [loading, setLoading] = React.useState(false);
  const [loadingProduct, setLoadingProduct] = React.useState(true);
  const [originalProduct, setOriginalProduct] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Cargar producto original
  React.useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError("ID de producto no válido");
        setLoadingProduct(false);
        return;
      }

      try {
        setLoadingProduct(true);
        const product = await getById(id);
        if (!product) {
          setError("Producto no encontrado");
          return;
        }
        setOriginalProduct(product);
      } catch (err: any) {
        setError(err?.message || "Error al cargar el producto");
      } finally {
        setLoadingProduct(false);
      }
    };

    loadProduct();
  }, [id, getById]);

  const handleSubmit = async (data: CreateProductInput) => {
    if (!authContext?.profile?.id) {
      setError("No hay usuario autenticado");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Añadir createdBy al data
      const productData: CreateProductInput = {
        ...data,
        createdBy: authContext.profile.id
      };

      await create(productData);
      
      // Redirigir a la lista de productos
      navigate("/products");
    } catch (err: any) {
      setError(err?.message || "Error al duplicar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/products");
  };

  if (loadingProduct) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-r-transparent" />
          <p className="text-gray-600 dark:text-gray-400">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error && !originalProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="mb-4">{error}</p>
          <Button onClick={() => navigate("/products")} variant="outline">
            Volver a productos
          </Button>
        </div>
      </div>
    );
  }

  // Preparar datos del producto para duplicar
  // Cambiar el código para que sea único (añadir "-COPIA" o similar)
  const duplicatedProduct = originalProduct ? {
    ...originalProduct,
    code: `${originalProduct.code}-COPIA`,
    name: `${originalProduct.name} (Copia)`,
    stockCurrent: 0, // Resetear stock a 0
    barcode: null, // Limpiar código de barras para evitar duplicados
    imageUrl: originalProduct.imageUrl, // Mantener imagen si existe
    // Mantener todos los demás campos
  } : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back") || "Volver"}
            </Button>
          </motion.div>
          
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-gray-50"
            >
              <Copy className="h-6 w-6 text-blue-500" />
              Duplicar Producto
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Se han pre-llenado todos los campos con los datos del producto original. 
              Puedes modificar cualquier campo antes de crear la copia. 
              El código se ha modificado automáticamente para evitar duplicados.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
        >
          {error}
        </motion.div>
      )}

      {/* Formulario */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {duplicatedProduct && (
          <ProductForm 
            product={duplicatedProduct} 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            loading={loading} 
          />
        )}
      </motion.div>
    </div>
  );
}

