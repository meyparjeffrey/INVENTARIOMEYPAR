import type { PermissionKey, UserProfile, UserSettings } from '@domain/entities';
import type { UserRepository } from '@domain/repositories/UserRepository';
import { Logger } from '@infrastructure/logging/logger';
import { SupabaseUserRepository } from '@infrastructure/repositories/SupabaseUserRepository';
import { supabaseClient } from '@infrastructure/supabase/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export interface LoginParams {
  email: string;
  password: string;
  rememberSession?: boolean;
}

export interface AuthContext {
  session: Session;
  profile: UserProfile;
  settings: UserSettings | null;
  permissions: PermissionKey[];
}

const ROLE_DEFAULT_PERMISSIONS: Record<UserProfile['role'], PermissionKey[]> = {
  ADMIN: [
    'products.view',
    'products.create',
    'products.edit',
    'products.delete',
    'products.import',
    'batches.view',
    'batches.create',
    'batches.edit',
    'batches.mark_defective',
    'batches.block',
    'movements.view',
    'movements.create_in',
    'movements.create_out',
    'movements.adjust',
    'scanner.use',
    'scanner.camera',
    'scanner.bulk_mode',
    'reports.view',
    'reports.export_excel',
    'reports.export_pdf',
    'reports.schedule',
    'ai.chat',
    'ai.suggestions_view',
    'ai.suggestions_accept',
    'suppliers.view',
    'suppliers.manage',
    'admin.users',
    'admin.permissions',
    'admin.settings',
    'admin.audit',
    'admin.backup',
  ],
  WAREHOUSE: [
    'products.view',
    'products.create',
    'products.edit',
    'batches.view',
    'batches.create',
    'batches.edit',
    'batches.mark_defective',
    'movements.view',
    'movements.create_in',
    'movements.create_out',
    'scanner.use',
    'scanner.camera',
    'reports.view',
    'reports.export_excel',
    'ai.chat',
    'ai.suggestions_view',
    'ai.suggestions_accept',
    'suppliers.view',
  ],
  VIEWER: [
    'products.view',
    'batches.view',
    'movements.view',
    'reports.view',
    'ai.chat',
    'ai.suggestions_view',
    'suppliers.view',
  ],
};

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository = new SupabaseUserRepository(),
  ) {}

  /**
   * Realiza login con Supabase y devuelve todo el contexto del usuario.
   */
  async login({
    email,
    password,
    rememberSession = true,
  }: LoginParams): Promise<AuthContext> {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      Logger.warn('[auth] Falló el login', error);
      throw error ?? new Error('No se pudo iniciar sesión');
    }

    if (!rememberSession) {
      await supabaseClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: '',
      });
    }

    return this.buildContext(data.session, data.user.id);
  }

  /**
   * Cierra sesión en Supabase.
   */
  async logout(): Promise<void> {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      Logger.error('[auth] Falló el logout', error);
      throw error;
    }
  }

  /**
   * Devuelve la sesión actual si existe.
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      Logger.error('[auth] Error recuperando sesión', error);
      throw error;
    }

    return data.session ?? null;
  }

  /**
   * Reconstruye el contexto completo a partir de la sesión vigente.
   */
  async getCurrentContext(): Promise<AuthContext | null> {
    const session = await this.getCurrentSession();
    if (!session?.user?.id) {
      return null;
    }

    return this.buildContext(session, session.user.id);
  }

  private async buildContext(session: Session, userId: string): Promise<AuthContext> {
    const profile = await this.userRepository.getProfileById(userId);
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }

    const settings = await this.userRepository.getSettings(userId);
    const explicitPermissions = await this.userRepository.listPermissions(userId);
    const permissions = this.mergePermissions(profile.role, explicitPermissions);

    return {
      session,
      profile,
      settings,
      permissions,
    };
  }

  private mergePermissions(
    role: UserProfile['role'],
    overrides: Awaited<ReturnType<UserRepository['listPermissions']>>,
  ): PermissionKey[] {
    const granted = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[role]);

    overrides.forEach((permission) => {
      if (permission.isGranted) {
        granted.add(permission.permissionKey);
      } else {
        granted.delete(permission.permissionKey);
      }
    });

    return Array.from(granted).sort();
  }
}
