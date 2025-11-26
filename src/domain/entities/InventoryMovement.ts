import type { Nullable, Timestamp, UUID } from "./common";

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";

export type MovementReasonCategory =
  | "PURCHASE"
  | "RETURN"
  | "PRODUCTION"
  | "CONSUMPTION"
  | "DEFECTIVE"
  | "EXPIRED"
  | "CORRECTION"
  | "INVENTORY_COUNT"
  | "OTHER";

export interface InventoryMovement {
  id: UUID;
  productId: UUID;
  batchId?: Nullable<UUID>;
  userId?: Nullable<UUID>;
  movementType: MovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  movementDate: Timestamp;
  requestReason: string;
  reasonCategory?: Nullable<MovementReasonCategory>;
  referenceDocument?: Nullable<string>;
  comments?: Nullable<string>;
  sourceLocation?: Nullable<string>;
  destinationLocation?: Nullable<string>;
  createdAt: Timestamp;
}
