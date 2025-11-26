import type { Nullable, Timestamp, UUID } from "./common";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "EXPORT"
  | "LOGIN"
  | "LOGOUT";

export interface AuditLog {
  id: UUID;
  userId?: Nullable<UUID>;
  entityType: string;
  entityId?: Nullable<UUID>;
  action: AuditAction;
  fieldName?: Nullable<string>;
  oldValue?: Nullable<string>;
  newValue?: Nullable<string>;
  ipAddress?: Nullable<string>;
  userAgent?: Nullable<string>;
  createdAt: Timestamp;
}

