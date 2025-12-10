import type { MovementType } from './InventoryMovement';
import type { Nullable, Timestamp, UUID } from './common';

export type UserRole = 'ADMIN' | 'WAREHOUSE' | 'VIEWER';

export interface UserProfile {
  id: UUID;
  firstName: string;
  lastName: string;
  initials: string;
  role: UserRole;
  avatarUrl?: Nullable<string>;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type LanguageCode = 'es-ES' | 'ca-ES';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
export type AvatarShape = 'circle' | 'square' | 'rounded';
export type AvatarShadowIntensity = 'none' | 'sm' | 'md' | 'lg';

export interface UserSettings {
  userId: UUID;
  language: LanguageCode;
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  scannerSoundEnabled: boolean;
  scannerVibrationEnabled: boolean;
  defaultMovementType: MovementType;
  itemsPerPage: number;
  dateFormat: string;
  // Avatar settings
  avatarSize: AvatarSize;
  avatarCustomSize?: Nullable<number>;
  avatarBorderEnabled: boolean;
  avatarBorderWidth: number;
  avatarBorderColor: string;
  avatarShadowEnabled: boolean;
  avatarShadowIntensity: AvatarShadowIntensity;
  avatarShape: AvatarShape;
  avatarAnimationEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const PERMISSION_KEYS = [
  'products.create',
  'products.edit',
  'products.delete',
  'products.view',
  'products.import',
  'batches.create',
  'batches.edit',
  'batches.mark_defective',
  'batches.block',
  'batches.view',
  'movements.create',
  'movements.create_in',
  'movements.create_out',
  'movements.adjust',
  'movements.view',
  'reports.view',
  'reports.export_excel',
  'reports.export_pdf',
  'reports.schedule',
  'scanner.use',
  'scanner.camera',
  'scanner.bulk_mode',
  'ai.chat',
  'ai.use',
  'ai.suggestions_view',
  'ai.suggestions_accept',
  'suppliers.view',
  'suppliers.manage',
  'admin.users',
  'admin.permissions',
  'admin.settings',
  'admin.audit',
  'admin.backup',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface UserPermission {
  id: UUID;
  userId: UUID;
  permissionKey: PermissionKey;
  isGranted: boolean;
  grantedBy?: Nullable<UUID>;
  grantedAt: Timestamp;
}

export interface UserLoginEvent {
  id: UUID;
  userId?: Nullable<UUID>;
  loginAt: Timestamp;
  ipAddress?: Nullable<string>;
  deviceInfo?: Nullable<string>;
  success: boolean;
  failureReason?: Nullable<string>;
}
