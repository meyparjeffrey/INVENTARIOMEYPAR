import * as React from "react";
import type { ProductBatch, BatchStatus, Product, UUID } from "@domain/entities";
import type { BatchFilters, CreateBatchInput, UpdateBatchInput } from "@domain/repositories/ProductRepository";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "./useRealtime";

const productRepository = new SupabaseProductRepository();

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
  createBatch: (input: CreateBatchInput) => Promise<ProductBatch>;
  updateBatch: (batchId: UUID, input: UpdateBatchInput) => Promise<ProductBatch>;
  findByBatchCodeOrBarcode: (term: string) => Promise<ProductBatch | null>;
  batchCodeExists: (batchCode: string) => Promise<boolean>;
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
      setTotalCount(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar lotes";
      setError(message);
      // eslint-disable-next-line no-console
      console.error("[useBatches] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, loadProductsMap]);

  // Función auxiliar para mapear desde row de Supabase
  const mapBatchFromRow = React.useCallback((row: Record<string, unknown>): ProductBatch => {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      supplierId: (row.supplier_id as string | null) ?? undefined,
      batchCode: row.batch_code as string,
      batchBarcode: (row.batch_barcode as string | null) ?? undefined,
      quantityTotal: Number(row.quantity_total) || 0,
      quantityAvailable: Number(row.quantity_available) || 0,
      quantityReserved: Number(row.quantity_reserved) || 0,
      defectiveQty: Number(row.defective_qty) || 0,
      status: row.status as BatchStatus,
      blockedReason: (row.blocked_reason as string | null) ?? undefined,
      qualityScore: Number(row.quality_score) || 1.0,
      receivedAt: row.received_at as string,
      expiryDate: (row.expiry_date as string | null) ?? undefined,
      manufactureDate: (row.manufacture_date as string | null) ?? undefined,
      costPerUnit: (row.cost_per_unit ? Number(row.cost_per_unit) : null) ?? undefined,
      locationOverride: (row.location_override as string | null) ?? undefined,
      notes: (row.notes as string | null) ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      createdBy: (row.created_by as string | null) ?? undefined
    };
  }, []);

  // Cargar al montar y cuando cambien filtros/página
  React.useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Sincronización en tiempo real con Supabase
  useRealtime<Record<string, unknown>>({
    table: "product_batches",
    onInsert: async (newBatch) => {
      // Cuando se crea un nuevo lote en Supabase, cargarlo con su producto
      try {
        const product = await productRepository.findById(newBatch.product_id as string);
        const enrichedBatch: BatchWithProduct = {
          ...mapBatchFromRow(newBatch),
          product: product || undefined
        };
        setBatches((prev) => {
          // Evitar duplicados
          if (prev.some((b) => b.id === enrichedBatch.id)) {
            return prev;
          }
          return [...prev, enrichedBatch].sort(
            (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
          );
        });
        setTotalCount((prev) => prev + 1);
      } catch (err) {
        // Si falla, recargar todo
        void loadBatches();
      }
    },
    onUpdate: async (updatedBatch) => {
      // Cuando se actualiza un lote en Supabase, actualizarlo en la lista
      try {
        const product = await productRepository.findById(updatedBatch.product_id as string);
        const enrichedBatch: BatchWithProduct = {
          ...mapBatchFromRow(updatedBatch),
          product: product || undefined
        };
        setBatches((prev) =>
          prev.map((b) => (b.id === enrichedBatch.id ? enrichedBatch : b))
        );
      } catch (err) {
        // Si falla, recargar todo
        void loadBatches();
      }
    },
    onDelete: (deletedBatch) => {
      // Cuando se elimina un lote en Supabase, removerlo de la lista
      setBatches((prev) => prev.filter((b) => b.id !== deletedBatch.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    }
  });

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

  const createBatch = React.useCallback(
    async (input: CreateBatchInput) => {
      try {
        const batch = await productRepository.createBatch(input);
        await loadBatches();
        return batch;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear lote";
        setError(message);
        throw err;
      }
    },
    [loadBatches]
  );

  const updateBatch = React.useCallback(
    async (batchId: UUID, input: UpdateBatchInput) => {
      try {
        const batch = await productRepository.updateBatch(batchId, input);
        await loadBatches();
        return batch;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar lote";
        setError(message);
        throw err;
      }
    },
    [loadBatches]
  );

  const findByBatchCodeOrBarcode = React.useCallback(
    async (term: string) => {
      try {
        return await productRepository.findByBatchCodeOrBarcode(term);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al buscar lote";
        setError(message);
        return null;
      }
    },
    []
  );

  const batchCodeExists = React.useCallback(
    async (batchCode: string) => {
      try {
        return await productRepository.batchCodeExists(batchCode);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al verificar código de lote";
        setError(message);
        return false;
      }
    },
    []
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
    updateBatchStatus,
    createBatch,
    updateBatch,
    findByBatchCodeOrBarcode,
    batchCodeExists
  };
}

