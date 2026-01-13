import * as React from "react";
import { ProductService } from "@application/services/ProductService";
import { MovementService } from "@application/services/MovementService";
import type { Product, UUID } from "@domain/entities";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput
} from "@domain/repositories/ProductRepository";
import type { PaginationParams } from "@domain/repositories/types";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryMovementRepository } from "@infrastructure/repositories/SupabaseInventoryMovementRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useRealtime } from "./useRealtime";

/**
 * Hook para gestionar productos con operaciones CRUD.
 * 
 * Proporciona estado, funciones y paginación para productos.
 * Incluye suscripción en tiempo real a cambios en Supabase.
 * 
 * @returns {Object} Objeto con productos, loading, error, pagination y funciones CRUD
 * @example
 * const { products, loading, list, create, update, remove } = useProducts();
 * 
 * // Cargar productos
 * await list({ search: "term", category: "Electrónica" }, { page: 1, pageSize: 25 });
 * 
 * // Crear producto
 * const newProduct = await create({ code: "PROD001", name: "Producto", ... });
 */
export function useProducts() {
  const [loading, setLoading] = React.useState(false);
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
    new SupabaseProductRepository()
  );
  const movementRepositoryRef = React.useRef(
    new SupabaseInventoryMovementRepository()
  );
  const movementServiceRef = React.useRef(
    new MovementService(movementRepositoryRef.current, repositoryRef.current)
  );
  const serviceRef = React.useRef<ProductService>(
    new ProductService(repositoryRef.current, movementServiceRef.current)
  );

  // Función para mapear un producto desde la fila de Supabase (igual que en el repositorio)
  const mapProductFromRow = React.useCallback((row: Record<string, unknown>): Product => {
    const parseDimensions = (raw: string | null) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    return {
      id: row.id as string,
      code: row.code as string,
      barcode: (row.barcode as string | null) ?? null,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      category: (row.category as string | null) ?? null,
      stockCurrent: Number(row.stock_current) || 0,
      stockMin: Number(row.stock_min) || 0,
      stockMax: (row.stock_max ? Number(row.stock_max) : null) ?? null,
      aisle: (row.aisle as string | null) || '',
      shelf: (row.shelf as string | null) || '',
      locationExtra: (row.location_extra as string | null) ?? null,
      costPrice: Number(row.cost_price) || 0,
      salePrice: row.sale_price ? Number(row.sale_price) : null,
      purchaseUrl: (row.purchase_url as string | null) ?? null,
      imageUrl: (row.image_url as string | null) ?? null,
      isActive: Boolean(row.is_active),
      isBatchTracked: Boolean(row.is_batch_tracked),
      unitOfMeasure: (row.unit_of_measure as string | null) ?? null,
      weightKg: row.weight_kg ? Number(row.weight_kg) : null,
      dimensionsCm: parseDimensions(row.dimensions_cm as string | null),
      notes: (row.notes as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      createdBy: row.created_by as string,
      updatedBy: (row.updated_by as string | null) ?? null
    };
  }, []);

  // Suscripción en tiempo real para productos (solo productos activos)
  useRealtime<Record<string, unknown>>({
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
   * Obtiene todos los productos aplicando filtros (sin paginación).
   */
  const getAll = React.useCallback(
    async (filters?: ProductFilters): Promise<Product[]> => {
      setLoading(true);
      setError(null);

      try {
        const products = await serviceRef.current.getAll(filters);
        return products;
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
        // Obtener userId de la sesión actual
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session?.user?.id;

        // eslint-disable-next-line no-console
        console.log("🔄 useProducts.update - userId obtenido:", userId);
        // eslint-disable-next-line no-console
        console.log("   Input recibido:", JSON.stringify(input, null, 2));

        const product = await serviceRef.current.update(id, input, userId);
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
   * Elimina físicamente un producto de la base de datos.
   * 
   * IMPORTANTE: Esta es una eliminación permanente e irreversible.
   * El producto se eliminará completamente de Supabase junto con sus relaciones.
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

  /**
   * Recarga la lista de productos con los filtros actuales.
   * Útil para refrescar datos después de cambios externos.
   */
  const refresh = React.useCallback(async () => {
    // Recargar con los mismos filtros (si hay alguno guardado)
    await list();
  }, [list]);

  return {
    products,
    loading,
    error,
    pagination,
    list,
    getAll,
    getById,
    create,
    update,
    remove,
    findByCode,
    refresh
  };
}

