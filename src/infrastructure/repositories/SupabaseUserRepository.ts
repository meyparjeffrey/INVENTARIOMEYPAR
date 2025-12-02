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
  // Avatar settings
  avatar_size: UserSettings["avatarSize"];
  avatar_custom_size: number | null;
  avatar_border_enabled: boolean;
  avatar_border_width: number;
  avatar_border_color: string;
  avatar_shadow_enabled: boolean;
  avatar_shadow_intensity: UserSettings["avatarShadowIntensity"];
  avatar_shape: UserSettings["avatarShape"];
  avatar_animation_enabled: boolean;
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
  sidebarCollapsed: row.sidebar_collapsed ?? false,
  notificationsEnabled: row.notifications_enabled ?? true,
  scannerSoundEnabled: row.scanner_sound_enabled ?? true,
  scannerVibrationEnabled: row.scanner_vibration_enabled ?? true,
  defaultMovementType: row.default_movement_type ?? "OUT",
  itemsPerPage: row.items_per_page ?? 25,
  dateFormat: row.date_format ?? "DD/MM/YYYY",
  // Avatar settings
  avatarSize: (row.avatar_size ?? "md") as UserSettings["avatarSize"],
  avatarCustomSize: row.avatar_custom_size ?? undefined,
  avatarBorderEnabled: row.avatar_border_enabled ?? false,
  avatarBorderWidth: row.avatar_border_width ?? 2,
  avatarBorderColor: row.avatar_border_color ?? "#DC2626",
  avatarShadowEnabled: row.avatar_shadow_enabled ?? true,
  avatarShadowIntensity: (row.avatar_shadow_intensity ?? "md") as UserSettings["avatarShadowIntensity"],
  avatarShape: (row.avatar_shape ?? "circle") as UserSettings["avatarShape"],
  avatarAnimationEnabled: row.avatar_animation_enabled ?? true,
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

  async updateProfile(id: string, input: import("@domain/repositories/UserRepository").UpdateProfileInput) {
    const updateData: Partial<ProfileRow> = {
      updated_at: new Date().toISOString()
    };

    if (input.firstName !== undefined) {
      updateData.first_name = input.firstName;
    }
    if (input.lastName !== undefined) {
      updateData.last_name = input.lastName;
    }
    if (input.avatarUrl !== undefined) {
      updateData.avatar_url = input.avatarUrl;
    }
    if (input.initials !== undefined) {
      updateData.initials = input.initials;
    }

    const { data, error } = await this.client
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    this.handleError("actualizar perfil", error);
    return mapProfile(data as ProfileRow);
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

  async updateSettings(userId: string, input: import("@domain/repositories/UserRepository").UpdateSettingsInput) {
    const updateData: Partial<SettingsRow> = {
      updated_at: new Date().toISOString()
    };

    if (input.language !== undefined) updateData.language = input.language;
    if (input.themeMode !== undefined) updateData.theme_mode = input.themeMode;
    if (input.primaryColor !== undefined) updateData.primary_color = input.primaryColor;
    if (input.secondaryColor !== undefined) updateData.secondary_color = input.secondaryColor;
    if (input.sidebarCollapsed !== undefined) updateData.sidebar_collapsed = input.sidebarCollapsed;
    if (input.notificationsEnabled !== undefined) updateData.notifications_enabled = input.notificationsEnabled;
    if (input.scannerSoundEnabled !== undefined) updateData.scanner_sound_enabled = input.scannerSoundEnabled;
    if (input.scannerVibrationEnabled !== undefined) updateData.scanner_vibration_enabled = input.scannerVibrationEnabled;
    if (input.defaultMovementType !== undefined) updateData.default_movement_type = input.defaultMovementType;
    if (input.itemsPerPage !== undefined) updateData.items_per_page = input.itemsPerPage;
    if (input.dateFormat !== undefined) updateData.date_format = input.dateFormat;
    
    // Avatar settings
    if (input.avatarSize !== undefined) updateData.avatar_size = input.avatarSize;
    if (input.avatarCustomSize !== undefined) updateData.avatar_custom_size = input.avatarCustomSize;
    if (input.avatarBorderEnabled !== undefined) updateData.avatar_border_enabled = input.avatarBorderEnabled;
    if (input.avatarBorderWidth !== undefined) updateData.avatar_border_width = input.avatarBorderWidth;
    if (input.avatarBorderColor !== undefined) updateData.avatar_border_color = input.avatarBorderColor;
    if (input.avatarShadowEnabled !== undefined) updateData.avatar_shadow_enabled = input.avatarShadowEnabled;
    if (input.avatarShadowIntensity !== undefined) updateData.avatar_shadow_intensity = input.avatarShadowIntensity;
    if (input.avatarShape !== undefined) updateData.avatar_shape = input.avatarShape;
    if (input.avatarAnimationEnabled !== undefined) updateData.avatar_animation_enabled = input.avatarAnimationEnabled;

    const { data, error } = await this.client
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          ...updateData
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    this.handleError("actualizar ajustes usuario", error);
    return mapSettings(data as SettingsRow);
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

