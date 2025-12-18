import type {
  InventoryMovement,
  MovementReasonCategory,
  MovementType,
  UUID,
} from '@domain/entities';
import type { PaginationParams, PaginatedResult } from './types';

export interface MovementFilters {
  productId?: UUID;
  batchId?: UUID;
  userId?: UUID;
  movementType?: MovementType;
  dateFrom?: string;
  dateTo?: string;
  search?: string; // Búsqueda por texto (código antiguo, nombre producto, comentarios, etc.)
  adjustmentType?: 'CODE' | 'NAME' | 'DESCRIPTION'; // Tipo de ajuste específico
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Filtro por almacén
  orderBy?: 'date' | 'product'; // Ordenar por fecha o producto
  orderDirection?: 'asc' | 'desc'; // Dirección de ordenación
}

export interface CreateInventoryMovementInput {
  productId: UUID;
  batchId?: UUID;
  userId?: UUID;
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  requestReason: string;
  reasonCategory?: MovementReasonCategory;
  referenceDocument?: string;
  comments?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  movementDate?: string;
  warehouse?: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA'; // Almacén donde se realiza el movimiento
}

export interface InventoryMovementRepository {
  /**
   * Lista movimientos con filtros comunes y paginación.
   */
  list(
    filters?: MovementFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<InventoryMovement>>;

  /**
   * Registra un movimiento y devuelve la fila completa.
   */
  recordMovement(payload: CreateInventoryMovementInput): Promise<InventoryMovement>;
}
