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

export interface UpdateSettingsInput {
  language?: UserSettings["language"];
  themeMode?: UserSettings["themeMode"];
  primaryColor?: string;
  secondaryColor?: string;
  sidebarCollapsed?: boolean;
  notificationsEnabled?: boolean;
  scannerSoundEnabled?: boolean;
  scannerVibrationEnabled?: boolean;
  defaultMovementType?: UserSettings["defaultMovementType"];
  itemsPerPage?: number;
  dateFormat?: string;
  // Avatar settings
  avatarSize?: UserSettings["avatarSize"];
  avatarCustomSize?: number | null;
  avatarBorderEnabled?: boolean;
  avatarBorderWidth?: number;
  avatarBorderColor?: string;
  avatarShadowEnabled?: boolean;
  avatarShadowIntensity?: UserSettings["avatarShadowIntensity"];
  avatarShape?: UserSettings["avatarShape"];
  avatarAnimationEnabled?: boolean;
  avatarHighContrast?: boolean;
  avatarAltTextCustom?: string | null;
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
   * Actualiza los ajustes del usuario.
   */
  updateSettings(userId: UUID, input: UpdateSettingsInput): Promise<UserSettings>;

  /**
   * Lista los permisos explícitos del usuario.
   */
  listPermissions(userId: UUID): Promise<UserPermission[]>;

  /**
   * Devuelve el historial reciente de logins para auditoría.
   */
  listLoginEvents(userId: UUID, limit?: number): Promise<UserLoginEvent[]>;
}

