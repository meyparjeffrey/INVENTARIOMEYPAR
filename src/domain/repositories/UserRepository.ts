import type {
  UserLoginEvent,
  UserPermission,
  UserProfile,
  UserSettings,
  UUID
} from "@domain/entities";

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  initials?: string;
  avatarUrl?: string | null;
}

export interface UserRepository {
  /**
   * Obtiene el perfil básico (tabla profiles).
   */
  getProfileById(id: UUID): Promise<UserProfile | null>;

  /**
   * Actualiza el perfil del usuario.
   */
  updateProfile(id: UUID, input: UpdateProfileInput): Promise<UserProfile>;

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

