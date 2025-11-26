import type { AppSetting, UUID } from "@domain/entities";

export interface SettingsRepository {
  /**
   * Devuelve todas las claves de configuración global.
   */
  getAll(): Promise<AppSetting[]>;

  /**
   * Actualiza una clave específica guardando auditoría básica.
   */
  updateSetting(
    key: string,
    value: Record<string, unknown>,
    userId?: UUID
  ): Promise<AppSetting>;
}

