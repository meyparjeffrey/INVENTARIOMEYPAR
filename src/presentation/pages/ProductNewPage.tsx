import { motion } from "framer-motion";
import { Package, Sparkles } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useProducts } from "../hooks/useProducts";
import { ProductForm } from "../components/products/ProductForm";
import type { CreateProductInput } from "@domain/repositories/ProductRepository";

/**
 * Página moderna e interactiva para crear un nuevo producto.
 */
export function ProductNewPage() {
  const navigate = useNavigate();
  const { create, loading } = useProducts();

  const handleSubmit = React.useCallback(
    async (data: CreateProductInput) => {
      // Obtener el usuario actual desde Supabase
      const {
        data: { user },
        error: authError
      } = await supabaseClient.auth.getUser();

      if (authError || !user?.id) {
        throw new Error("No hay usuario autenticado");
      }

      const createData: CreateProductInput = {
        ...data,
        createdBy: user.id
      };

      await create(createData);
      navigate("/products");
    },
    [create, navigate]
  );

  const handleCancel = React.useCallback(() => {
    navigate("/products");
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* Header animado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-blue-50/30 p-8 shadow-lg dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-blue-900/20"
      >
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent opacity-0 transition-opacity duration-1000 hover:opacity-100" />
        
        <div className="relative flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
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
              Nuevo Producto
              <Sparkles className="h-6 w-6 text-blue-500" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Completa el formulario para crear un nuevo producto en el inventario. Los campos marcados con{" "}
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
        <ProductForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
      </motion.div>
    </div>
  );
}
