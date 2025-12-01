import * as React from "react";
import type { ProductBatch, BatchStatus, Product, UUID } from "@domain/entities";
import type { BatchFilters } from "@domain/repositories/ProductRepository";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

const productRepository = new SupabaseProductRepository(supabaseClient);

interface BatchWithProduct extends ProductBatch {
  product?: Product;
}

interface UseBatchesReturn {
  batches: BatchWithProduct[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: BatchFilters;
  setFilters: (filters: BatchFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  updateBatchStatus: (batchId: UUID, status: BatchStatus, reason?: string) => Promise<void>;
}

/**
 * Hook para gestionar lotes de productos.
 */
export function useBatches(): UseBatchesReturn {
  const [batches, setBatches] = React.useState<BatchWithProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [filters, setFilters] = React.useState<BatchFilters>({});

  // Cargar productos para enriquecer los lotes
  const loadProductsMap = React.useCallback(async (productIds: UUID[]) => {
    const uniqueIds = [...new Set(productIds)];
    const productsMap: Record<UUID, Product> = {};

    for (const id of uniqueIds) {
      try {
        const product = await productRepository.findById(id);
        if (product) {
          productsMap[id] = product;
        }
      } catch {
        // Ignorar errores de productos no encontrados
      }
    }

    return productsMap;
  }, []);

  const loadBatches = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await productRepository.listBatches(filters, { page, pageSize });

      // Cargar productos asociados
      const productIds = result.data.map((b) => b.productId);
      const productsMap = await loadProductsMap(productIds);

      // Enriquecer lotes con datos de producto
      const enrichedBatches = result.data.map((b) => ({
        ...b,
        product: productsMap[b.productId]
      }));

      setBatches(enrichedBatches);
      setTotalCount(result.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar lotes";
      setError(message);
      // eslint-disable-next-line no-console
      console.error("[useBatches] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, loadProductsMap]);

  // Cargar al montar y cuando cambien filtros/página
  React.useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const updateBatchStatus = React.useCallback(
    async (batchId: UUID, status: BatchStatus, reason?: string) => {
      try {
        await productRepository.updateBatchStatus(batchId, status, reason);
        await loadBatches();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar estado";
        setError(message);
        throw err;
      }
    },
    [loadBatches]
  );

  return {
    batches,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    filters,
    setFilters,
    setPage,
    refresh: loadBatches,
    updateBatchStatus
  };
}

