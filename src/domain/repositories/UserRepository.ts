import type {
  UserLoginEvent,
  UserPermission,
  UserProfile,
  UserSettings,
  UUID
} from "@domain/entities";

export interface UserRepository {
  /**
   * Obtiene el perfil básico (tabla profiles).
   */
  getProfileById(id: UUID): Promise<UserProfile | null>;

  /**
   * Obtiene los ajustes personalizados del usuario.
   */
  getSettings(userId: UUID): Promise<UserSettings | null>;

  /**
   * Lista los permisos explícitos del usuario.
   */
  listPermissions(userId: UUID): Promise<UserPermission[]>;

  /**
   * Devuelve el historial reciente de logins para auditoría.
   */
  listLoginEvents(userId: UUID, limit?: number): Promise<UserLoginEvent[]>;
}

