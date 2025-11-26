import type { AuditLog } from "@domain/entities";
import type {
  AuditFilters,
  AuditRepository
} from "@domain/repositories/AuditRepository";
import type { PaginationParams } from "@domain/repositories/types";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";
import { buildPagination, toPaginatedResult } from "./pagination";

type AuditRow = {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: AuditLog["action"];
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const mapAudit = (row: AuditRow): AuditLog => ({
  id: row.id,
  userId: row.user_id ?? undefined,
  entityType: row.entity_type,
  entityId: row.entity_id ?? undefined,
  action: row.action,
  fieldName: row.field_name ?? undefined,
  oldValue: row.old_value ?? undefined,
  newValue: row.new_value ?? undefined,
  ipAddress: row.ip_address ?? undefined,
  userAgent: row.user_agent ?? undefined,
  createdAt: row.created_at
});

export class SupabaseAuditRepository
  extends BaseSupabaseRepository
  implements AuditRepository
{
  async list(filters?: AuditFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters?.entityType) {
      query = query.eq("entity_type", filters.entityType);
    }

    if (filters?.entityId) {
      query = query.eq("entity_id", filters.entityId);
    }

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters?.action) {
      query = query.eq("action", filters.action);
    }

    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error, count } = await query.range(from, to);
    this.handleError("listar auditoría", error);

    return toPaginatedResult(
      (data ?? []).map((row) => mapAudit(row as AuditRow)),
      count ?? null,
      page,
      pageSize
    );
  }
}

