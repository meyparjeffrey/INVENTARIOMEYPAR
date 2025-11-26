import type { InventoryMovement } from "@domain/entities";
import type {
  CreateInventoryMovementInput,
  InventoryMovementRepository,
  MovementFilters
} from "@domain/repositories/InventoryMovementRepository";
import type { PaginationParams } from "@domain/repositories/types";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";
import { buildPagination, toPaginatedResult } from "./pagination";

type MovementRow = {
  id: string;
  product_id: string;
  batch_id: string | null;
  user_id: string | null;
  movement_type: InventoryMovement["movementType"];
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  movement_date: string;
  request_reason: string;
  reason_category: InventoryMovement["reasonCategory"] | null;
  reference_document: string | null;
  comments: string | null;
  source_location: string | null;
  destination_location: string | null;
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
  createdAt: row.created_at
});

export class SupabaseInventoryMovementRepository
  extends BaseSupabaseRepository
  implements InventoryMovementRepository
{
  async list(
    filters?: MovementFilters,
    pagination?: PaginationParams
  ) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from("inventory_movements")
      .select("*", { count: "exact" })
      .order("movement_date", { ascending: false });

    if (filters?.productId) {
      query = query.eq("product_id", filters.productId);
    }

    if (filters?.batchId) {
      query = query.eq("batch_id", filters.batchId);
    }

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters?.movementType) {
      query = query.eq("movement_type", filters.movementType);
    }

    if (filters?.dateFrom) {
      query = query.gte("movement_date", filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte("movement_date", filters.dateTo);
    }

    const { data, error, count } = await query.range(from, to);
    this.handleError("listar movimientos", error);

    return toPaginatedResult(
      (data ?? []).map((row) => mapMovement(row as MovementRow)),
      count ?? null,
      page,
      pageSize
    );
  }

  async recordMovement(payload: CreateInventoryMovementInput) {
    const { data, error } = await this.client
      .from("inventory_movements")
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
        destination_location: payload.destinationLocation ?? null
      })
      .select("*")
      .single();

    this.handleError("registrar movimiento", error);
    return mapMovement(data as MovementRow);
  }
}

