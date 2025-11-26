import type { AuditLog, AuditAction, UUID } from "@domain/entities";
import type { PaginationParams, PaginatedResult } from "./types";

export interface AuditFilters {
  entityType?: string;
  entityId?: UUID;
  userId?: UUID;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditRepository {
  list(
    filters?: AuditFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>>;
}

