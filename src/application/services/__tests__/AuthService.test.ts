import type {
  PermissionKey,
  UserProfile,
  UserSettings
} from "@domain/entities";
import type { UserRepository } from "@domain/repositories/UserRepository";
import type { Session, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  setSession: vi.fn(),
  getSession: vi.fn()
}));

vi.mock("@infrastructure/supabase/supabaseClient", () => ({
  supabaseClient: {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      setSession: authMocks.setSession,
      getSession: authMocks.getSession
    }
  }
}));

vi.mock("@infrastructure/logging/logger", () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { AuthService } from "../AuthService";

const createUserRepositoryMock = () => {
  const profile: UserProfile = {
    id: "user-1",
    firstName: "María",
    lastName: "López",
    initials: "ML",
    role: "WAREHOUSE",
    avatarUrl: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const settings: UserSettings = {
    userId: "user-1",
    language: "es-ES",
    themeMode: "system",
    primaryColor: "#DC2626",
    secondaryColor: "#059669",
    sidebarCollapsed: false,
    notificationsEnabled: true,
    scannerSoundEnabled: true,
    scannerVibrationEnabled: true,
    defaultMovementType: "OUT",
    itemsPerPage: 25,
    dateFormat: "DD/MM/YYYY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const getProfileById = vi.fn().mockResolvedValue(profile);
  const getSettings = vi.fn().mockResolvedValue(settings);
  const listPermissions = vi
    .fn()
    .mockResolvedValue([
      {
        id: "perm-1",
        userId: "user-1",
        permissionKey: "products.create" as PermissionKey,
        isGranted: false,
        grantedBy: null,
        grantedAt: settings.createdAt
      }
    ]);
  const listLoginEvents = vi.fn().mockResolvedValue([]);

  const updateProfile = vi.fn().mockResolvedValue(profile);
  
  const repo: UserRepository = {
    getProfileById,
    updateProfile,
    getSettings,
    listPermissions,
    listLoginEvents
  };

  return { repo, profile, settings, spies: { getProfileById, getSettings, listPermissions, listLoginEvents } };
};

const createSession = (overrides?: Partial<Session>): Session =>
  ({
    access_token: "token",
    token_type: "bearer",
    user: { id: "user-1" } as User,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "refresh",
    provider_token: null,
    provider_refresh_token: null,
    ...overrides
  }) as Session;

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(authMocks).forEach((fn) => fn.mockReset());
  });

  it("login devuelve contexto completo y respeta overrides de permisos", async () => {
    const { repo, profile, settings } = createUserRepositoryMock();

    authMocks.signInWithPassword.mockResolvedValueOnce({
      data: { session: createSession(), user: { id: "user-1" } },
      error: null
    });

    const service = new AuthService(repo);
    const context = await service.login({
      email: "demo@example.com",
      password: "secret"
    });

    expect(context.profile).toEqual(profile);
    expect(context.settings).toEqual(settings);
    expect(context.permissions).not.toContain("products.create");
    expect(context.permissions).toContain("products.view");
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "demo@example.com",
      password: "secret"
    });
  });

  it("login lanza error cuando supabase falla", async () => {
    const fakeError = new Error("Invalid credentials");
    authMocks.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: fakeError
    });

    const { repo } = createUserRepositoryMock();
    const service = new AuthService(repo);

    await expect(
      service.login({ email: "demo@example.com", password: "bad" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("getCurrentContext devuelve null si no hay sesión", async () => {
    authMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null
    });

    const { repo } = createUserRepositoryMock();
    const service = new AuthService(repo);

    await expect(service.getCurrentContext()).resolves.toBeNull();
  });

  it("logout propaga errores de supabase", async () => {
    const fakeError = new Error("network");
    authMocks.signOut.mockResolvedValueOnce({ error: fakeError });
    const { repo } = createUserRepositoryMock();
    const service = new AuthService(repo);

    await expect(service.logout()).rejects.toThrow("network");
  });
});
