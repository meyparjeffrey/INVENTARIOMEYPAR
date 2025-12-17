import * as React from 'react';
import type {
  InventoryMovement,
  MovementType,
  MovementReasonCategory,
  UUID,
  Product,
} from '@domain/entities';
import type { MovementFilters } from '@domain/repositories/InventoryMovementRepository';
import { SupabaseInventoryMovementRepository } from '@infrastructure/repositories/SupabaseInventoryMovementRepository';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import { MovementService } from '@application/services/MovementService';

const movementRepository = new SupabaseInventoryMovementRepository(supabaseClient);
const productRepository = new SupabaseProductRepository(supabaseClient);
const movementService = new MovementService(movementRepository, productRepository);

interface MovementWithProduct extends InventoryMovement {
  product?: Product;
  userFirstName?: string | null;
  userLastName?: string | null;
  productCode?: string | null;
  productName?: string | null;
}

interface UseMovementsReturn {
  movements: MovementWithProduct[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: MovementFilters;
  setFilters: (filters: MovementFilters) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  recordMovement: (input: {
    productId: UUID;
    batchId?: UUID;
    movementType: MovementType;
    quantity: number;
    requestReason: string;
    reasonCategory?: MovementReasonCategory;
    referenceDocument?: string;
    comments?: string;
    warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
  }) => Promise<InventoryMovement>;
}

/**
 * Hook para gestionar movimientos de inventario.
 */
export function useMovements(): UseMovementsReturn {
  const [movements, setMovements] = React.useState<MovementWithProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [filters, setFilters] = React.useState<MovementFilters>({});

  // Cargar productos para enriquecer los movimientos
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

  const loadMovements = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await movementService.list(filters, { page, pageSize });

      // Cargar productos asociados
      const productIds = result.data.map((m) => m.productId);
      const productsMap = await loadProductsMap(productIds);

      // Enriquecer movimientos con datos de producto y usuario
      const enrichedMovements: MovementWithProduct[] = result.data.map((m) => ({
        ...m,
        product: productsMap[m.productId],
        userFirstName: m.userFirstName,
        userLastName: m.userLastName,
        productCode: m.productCode,
        productName: m.productName,
      }));

      setMovements(enrichedMovements);
      setTotalCount(result.totalCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar movimientos';
      setError(message);
      // eslint-disable-next-line no-console
      console.error('[useMovements] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, loadProductsMap]);

  // Cargar al montar y cuando cambien filtros/página
  React.useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const recordMovement = React.useCallback(
    async (input: {
      productId: UUID;
      batchId?: UUID;
      movementType: MovementType;
      quantity: number;
      requestReason: string;
      reasonCategory?: MovementReasonCategory;
      referenceDocument?: string;
      comments?: string;
      warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA';
    }) => {
      // Obtener userId de la sesión actual
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const userId = session?.user?.id;

      const movement = await movementService.recordMovement({
        ...input,
        userId,
      });

      // Recargar lista
      await loadMovements();

      return movement;
    },
    [loadMovements],
  );

  return {
    movements,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    filters,
    setFilters,
    setPage,
    refresh: loadMovements,
    recordMovement,
  };
}
