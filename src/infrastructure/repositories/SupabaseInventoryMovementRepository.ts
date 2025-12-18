import type { InventoryMovement } from '@domain/entities';
import type {
  CreateInventoryMovementInput,
  InventoryMovementRepository,
  MovementFilters,
} from '@domain/repositories/InventoryMovementRepository';
import type { PaginationParams } from '@domain/repositories/types';
import { BaseSupabaseRepository } from './BaseSupabaseRepository';
import { buildPagination, toPaginatedResult } from './pagination';

type MovementRow = {
  id: string;
  product_id: string;
  batch_id: string | null;
  user_id: string | null;
  movement_type: InventoryMovement['movementType'];
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  movement_date: string;
  request_reason: string;
  reason_category: InventoryMovement['reasonCategory'] | null;
  reference_document: string | null;
  comments: string | null;
  source_location: string | null;
  destination_location: string | null;
  warehouse: string | null;
  created_at: string;
};

const mapMovement = (row: MovementRow): InventoryMovement => ({
  id: row.id,
  productId: row.product_id,
  batchId: row.batch_id,
  userId: row.user_id,
  movementType: row.movement_type,
  quantity: row.quantity,
  quantityBefore: row.quantity_before,
  quantityAfter: row.quantity_after,
  movementDate: row.movement_date,
  requestReason: row.request_reason,
  reasonCategory: row.reason_category ?? undefined,
  referenceDocument: row.reference_document ?? undefined,
  comments: row.comments ?? undefined,
  sourceLocation: row.source_location ?? undefined,
  destinationLocation: row.destination_location ?? undefined,
  warehouse:
    row.warehouse && ['MEYPAR', 'OLIVA_TORRAS', 'FURGONETA'].includes(row.warehouse)
      ? (row.warehouse as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA')
      : undefined,
  createdAt: row.created_at,
});

export class SupabaseInventoryMovementRepository
  extends BaseSupabaseRepository
  implements InventoryMovementRepository
{
  async list(filters?: MovementFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);

    // Incluir datos del usuario y producto en la consulta
    let query = this.client.from('inventory_movements').select(
      `
        *,
        profiles!inventory_movements_user_id_fkey(first_name, last_name),
        products!inventory_movements_product_id_fkey(code, name, stock_current)
      `,
      { count: 'exact' },
    );

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }

    if (filters?.batchId) {
      query = query.eq('batch_id', filters.batchId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    // Filtro por tipo de ajuste específico (busca en comentarios)
    if (filters?.adjustmentType) {
      const adjustmentPatterns: Record<string, string> = {
        CODE: 'Código:',
        NAME: 'Nombre:',
        DESCRIPTION: 'Descripción:',
      };
      const pattern = adjustmentPatterns[filters.adjustmentType];
      if (pattern) {
        query = query.ilike('comments', `%${pattern}%`);
        // Asegurar que también sea tipo ADJUSTMENT
        if (!filters.movementType) {
          query = query.eq('movement_type', 'ADJUSTMENT');
        }
      }
    }

    if (filters?.dateFrom) {
      query = query.gte('movement_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('movement_date', filters.dateTo);
    }

    if (filters?.warehouse) {
      query = query.eq('warehouse', filters.warehouse);
    }

    // Búsqueda por texto (en comments, request_reason, código producto, nombre producto)
    if (filters?.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();

      // Buscar productos que coincidan con el código o nombre
      const { data: matchingProducts } = await this.client
        .from('products')
        .select('id')
        .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);

      const matchingProductIds = matchingProducts?.map((p: { id: string }) => p.id) || [];

      // Construir condición de búsqueda
      const searchConditions: string[] = [
        `comments.ilike.%${searchTerm}%`,
        `request_reason.ilike.%${searchTerm}%`,
      ];

      // Si hay productos que coinciden, añadir filtro por product_id
      if (matchingProductIds.length > 0) {
        // Para cada product_id, añadir una condición
        const productConditions = matchingProductIds.map(
          (id: string) => `product_id.eq.${id}`,
        );
        searchConditions.push(...productConditions);
      }

      query = query.or(searchConditions.join(','));
    }

    // Ordenación
    const orderBy = filters?.orderBy || 'date';
    const orderDirection = filters?.orderDirection || 'desc';

    if (orderBy === 'date') {
      query = query.order('movement_date', { ascending: orderDirection === 'asc' });
    } else if (orderBy === 'product') {
      // Ordenar por nombre de producto requiere join, así que ordenamos por product_id
      query = query.order('product_id', { ascending: orderDirection === 'asc' });
      // Luego ordenar por fecha como secundario para mantener consistencia
      query = query.order('movement_date', { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);
    this.handleError('listar movimientos', error);

    // Mapear resultados incluyendo datos del usuario
    const movements = (data ?? []).map(
      (row: MovementRow & { profiles?: unknown; products?: unknown }) => {
        const movement = mapMovement(row as MovementRow);
        // Acceder a los datos relacionados (pueden venir como array o objeto)
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const product = Array.isArray(row.products) ? row.products[0] : row.products;

        return {
          ...movement,
          userFirstName: profile?.first_name || null,
          userLastName: profile?.last_name || null,
          productCode: product?.code || null,
          productName: product?.name || null,
          productStockCurrent: product?.stock_current ?? null,
        };
      },
    );

    return toPaginatedResult(
      movements as InventoryMovement[],
      count ?? null,
      page,
      pageSize,
    );
  }

  async recordMovement(payload: CreateInventoryMovementInput) {
    // eslint-disable-next-line no-console
    console.log('📝 Intentando registrar movimiento en Supabase:', {
      productId: payload.productId,
      userId: payload.userId,
      movementType: payload.movementType,
      quantity: payload.quantity,
      quantityBefore: payload.quantityBefore,
      quantityAfter: payload.quantityAfter,
    });

    const { data, error } = await this.client
      .from('inventory_movements')
      .insert({
        product_id: payload.productId,
        batch_id: payload.batchId ?? null,
        user_id: payload.userId ?? null,
        movement_type: payload.movementType,
        quantity: payload.quantity,
        quantity_before: payload.quantityBefore,
        quantity_after: payload.quantityAfter,
        movement_date: payload.movementDate ?? new Date().toISOString(),
        request_reason: payload.requestReason,
        reason_category: payload.reasonCategory ?? null,
        reference_document: payload.referenceDocument ?? null,
        comments: payload.comments ?? null,
        source_location: payload.sourceLocation ?? null,
        destination_location: payload.destinationLocation ?? null,
        warehouse: payload.warehouse ?? null,
      })
      .select('*')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error al insertar movimiento en Supabase:', error);
      // eslint-disable-next-line no-console
      console.error('   Código:', error.code);
      // eslint-disable-next-line no-console
      console.error('   Mensaje:', error.message);
      // eslint-disable-next-line no-console
      console.error('   Detalles:', error.details);
      // eslint-disable-next-line no-console
      console.error('   Hint:', error.hint);
      // eslint-disable-next-line no-console
      console.error('   Payload completo:', JSON.stringify(payload, null, 2));
    } else {
      // eslint-disable-next-line no-console
      console.log('✅ Movimiento insertado exitosamente en Supabase:', data?.id);
      // eslint-disable-next-line no-console
      console.log('   Datos insertados:', JSON.stringify(data, null, 2));
    }

    this.handleError('registrar movimiento', error);
    return mapMovement(data as MovementRow);
  }
}
