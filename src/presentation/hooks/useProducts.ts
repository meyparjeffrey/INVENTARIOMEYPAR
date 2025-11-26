import * as React from "react";
import { ProductService } from "@application/services/ProductService";
import type { Product, UUID } from "@domain/entities";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput
} from "@domain/repositories/ProductRepository";
import type { PaginationParams, PaginatedResult } from "@domain/repositories/types";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "./useRealtime";

/**
 * Hook para gestionar productos con operaciones CRUD.
 */
export function useProducts() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [pagination, setPagination] = React.useState<{
    total: number;
    page: number;
    pageSize: number;
  }>({
    total: 0,
    page: 1,
    pageSize: 25
  });

  const repositoryRef = React.useRef<ProductRepository>(
    new SupabaseProductRepository(supabaseClient)
  );
  const serviceRef = React.useRef<ProductService>(
    new ProductService(repositoryRef.current)
  );

  // Función para mapear un producto desde la fila de Supabase (igual que en el repositorio)
  const mapProductFromRow = React.useCallback((row: any): Product => {
    const parseDimensions = (raw: string | null) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    return {
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
      costPrice: Number(row.cost_price),
      salePrice: row.sale_price ? Number(row.sale_price) : null,
      purchaseUrl: row.purchase_url,
      imageUrl: row.image_url,
      isActive: row.is_active,
      isBatchTracked: row.is_batch_tracked,
      unitOfMeasure: row.unit_of_measure,
      weightKg: row.weight_kg ? Number(row.weight_kg) : null,
      dimensionsCm: parseDimensions(row.dimensions_cm),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }, []);

  // Suscripción en tiempo real para productos (solo productos activos)
  useRealtime<any>({
    table: "products",
    filter: "is_active=eq.true",
    onInsert: (newProduct) => {
      if (!newProduct.is_active) return; // Ignorar productos inactivos
      const product = mapProductFromRow(newProduct);
      setProducts((prev) => {
        // Evitar duplicados
        if (prev.some((p) => p.id === product.id)) {
          return prev;
        }
        return [...prev, product].sort((a, b) => a.name.localeCompare(b.name));
      });
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1
      }));
    },
    onUpdate: (updatedProduct) => {
      const product = mapProductFromRow(updatedProduct);
      if (product.isActive) {
        // Si está activo, actualizar o añadir
        setProducts((prev) => {
          const exists = prev.some((p) => p.id === product.id);
          if (exists) {
            return prev.map((p) => (p.id === product.id ? product : p));
          }
          return [...prev, product].sort((a, b) => a.name.localeCompare(b.name));
        });
      } else {
        // Si se desactiva, remover de la lista
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));
      }
    },
    onDelete: (deletedProduct) => {
      setProducts((prev) => prev.filter((p) => p.id !== deletedProduct.id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
    }
  });

  /**
   * Lista productos con filtros y paginación.
   */
  const list = React.useCallback(
    async (filters?: ProductFilters, paginationParams?: PaginationParams) => {
      setLoading(true);
      setError(null);

      try {
        const result = await repositoryRef.current.list(filters, paginationParams);
        setProducts(result.data ?? []);
        setPagination({
          total: result.total ?? 0,
          page: paginationParams?.page ?? 1,
          pageSize: paginationParams?.pageSize ?? 25
        });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar productos";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene un producto por ID.
   */
  const getById = React.useCallback(async (id: UUID): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const product = await repositoryRef.current.findById(id);
      return product;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al obtener producto";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea un nuevo producto.
   */
  const create = React.useCallback(
    async (input: CreateProductInput): Promise<Product> => {
      setLoading(true);
      setError(null);

      try {
        const product = await serviceRef.current.create(input);
        // Refrescar lista
        await list();
        return product;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear producto";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [list]
  );

  /**
   * Actualiza un producto existente.
   */
  const update = React.useCallback(
    async (id: UUID, input: UpdateProductInput): Promise<Product> => {
      setLoading(true);
      setError(null);

      try {
        const product = await serviceRef.current.update(id, input);
        // Actualizar en la lista local
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? product : p))
        );
        return product;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al actualizar producto";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Elimina (baja lógica) un producto.
   */
  const remove = React.useCallback(
    async (id: UUID): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await serviceRef.current.delete(id);
        // Remover de la lista local
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al eliminar producto";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Busca un producto por código o barcode.
   */
  const findByCode = React.useCallback(
    async (term: string): Promise<Product | null> => {
      setLoading(true);
      setError(null);

      try {
        const product = await repositoryRef.current.findByCodeOrBarcode(term);
        return product;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al buscar producto";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    products,
    loading,
    error,
    pagination,
    list,
    getById,
    create,
    update,
    remove,
    findByCode
  };
}

