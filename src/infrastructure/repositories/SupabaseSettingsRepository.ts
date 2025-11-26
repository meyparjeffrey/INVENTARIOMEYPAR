import type { AppSetting } from "@domain/entities";
import type { SettingsRepository } from "@domain/repositories/SettingsRepository";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";

type SettingRow = {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

const mapSetting = (row: SettingRow): AppSetting => ({
  key: row.key,
  value: row.value,
  description: row.description ?? undefined,
  updatedBy: row.updated_by ?? undefined,
  updatedAt: row.updated_at
});

export class SupabaseSettingsRepository
  extends BaseSupabaseRepository
  implements SettingsRepository
{
  async getAll() {
    const { data, error } = await this.client
      .from("app_settings")
      .select("*")
      .order("key", { ascending: true });
    this.handleError("listar ajustes globales", error);
    return (data ?? []).map((row) => mapSetting(row as SettingRow));
  }

  async updateSetting(key: string, value: Record<string, unknown>, userId?: string) {
    const { data, error } = await this.client
      .from("app_settings")
      .upsert(
        {
          key,
          value,
          updated_by: userId ?? null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      )
      .select("*")
      .single();

    this.handleError("actualizar ajuste global", error);
    return mapSetting(data as SettingRow);
  }
}

