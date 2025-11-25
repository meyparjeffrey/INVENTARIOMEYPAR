export type MovementType = "IN" | "OUT";

export interface InventoryMovement {
  id: string;
  productId: string;
  batchId?: string | null;
  userId: string;
  movementType: MovementType;
  quantity: number;
  requestReason: string;
  comments?: string | null;
  movementDate: string;
}

