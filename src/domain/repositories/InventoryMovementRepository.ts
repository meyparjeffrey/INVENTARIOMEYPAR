import type {
  InventoryMovement,
  MovementReasonCategory,
  MovementType,
  UUID
} from "@domain/entities";
import type { PaginationParams, PaginatedResult } from "./types";

export interface MovementFilters {
  productId?: UUID;
  batchId?: UUID;
  userId?: UUID;
  movementType?: MovementType;
  dateFrom?: string;
  dateTo?: string;
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
}

export interface InventoryMovementRepository {
  /**
   * Lista movimientos con filtros comunes y paginación.
   */
  list(
    filters?: MovementFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<InventoryMovement>>;

  /**
   * Registra un movimiento y devuelve la fila completa.
   */
  recordMovement(
    payload: CreateInventoryMovementInput
  ): Promise<InventoryMovement>;
}

