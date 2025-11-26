import type {
  UserLoginEvent,
  UserPermission,
  UserProfile,
  UserSettings
} from "@domain/entities";
import type { UserRepository } from "@domain/repositories/UserRepository";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  initials: string;
  role: UserProfile["role"];
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SettingsRow = {
  user_id: string;
  language: UserSettings["language"];
  theme_mode: UserSettings["themeMode"];
  primary_color: string;
  secondary_color: string;
  sidebar_collapsed: boolean;
  notifications_enabled: boolean;
  scanner_sound_enabled: boolean;
  scanner_vibration_enabled: boolean;
  default_movement_type: UserSettings["defaultMovementType"];
  items_per_page: number;
  date_format: string;
  created_at: string;
  updated_at: string;
};

type PermissionRow = {
  id: string;
  user_id: string;
  permission_key: UserPermission["permissionKey"];
  is_granted: boolean;
  granted_by: string | null;
  granted_at: string;
};

type LoginEventRow = {
  id: string;
  user_id: string | null;
  login_at: string;
  ip_address: string | null;
  device_info: string | null;
  success: boolean;
  failure_reason: string | null;
};

const mapProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  initials: row.initials,
  role: row.role,
  avatarUrl: row.avatar_url ?? undefined,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapSettings = (row: SettingsRow): UserSettings => ({
  userId: row.user_id,
  language: row.language,
  themeMode: row.theme_mode,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  sidebarCollapsed: row.sidebar_collapsed,
  notificationsEnabled: row.notifications_enabled,
  scannerSoundEnabled: row.scanner_sound_enabled,
  scannerVibrationEnabled: row.scanner_vibration_enabled,
  defaultMovementType: row.default_movement_type,
  itemsPerPage: row.items_per_page,
  dateFormat: row.date_format,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPermission = (row: PermissionRow): UserPermission => ({
  id: row.id,
  userId: row.user_id,
  permissionKey: row.permission_key,
  isGranted: row.is_granted,
  grantedBy: row.granted_by ?? undefined,
  grantedAt: row.granted_at
});

const mapLogin = (row: LoginEventRow): UserLoginEvent => ({
  id: row.id,
  userId: row.user_id ?? undefined,
  loginAt: row.login_at,
  ipAddress: row.ip_address ?? undefined,
  deviceInfo: row.device_info ?? undefined,
  success: row.success,
  failureReason: row.failure_reason ?? undefined
});

export class SupabaseUserRepository
  extends BaseSupabaseRepository
  implements UserRepository
{
  async getProfileById(id: string) {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    this.handleError("obtener perfil", error);
    return data ? mapProfile(data as ProfileRow) : null;
  }

  async getSettings(userId: string) {
    const { data, error } = await this.client
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    this.handleError("obtener ajustes usuario", error);
    return data ? mapSettings(data as SettingsRow) : null;
  }

  async listPermissions(userId: string) {
    const { data, error } = await this.client
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId)
      .order("permission_key");
    this.handleError("listar permisos usuario", error);
    return (data ?? []).map((row) => mapPermission(row as PermissionRow));
  }

  async listLoginEvents(userId: string, limit = 20) {
    const { data, error } = await this.client
      .from("user_login_events")
      .select("*")
      .eq("user_id", userId)
      .order("login_at", { ascending: false })
      .limit(limit);
    this.handleError("listar eventos login", error);
    return (data ?? []).map((row) => mapLogin(row as LoginEventRow));
  }
}

