import { describe, expect, it, vi, beforeEach } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();
const setSession = vi.fn();

vi.mock("@infrastructure/supabase/supabaseClient", () => ({
  supabaseClient: {
    auth: { signInWithPassword, signOut, setSession }
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

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login devuelve datos cuando supabase responde ok", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
      error: null
    });

    const service = new AuthService();
    const result = await service.login({
      email: "demo@example.com",
      password: "secret"
    });

    expect(result).toEqual({ session: { access_token: "token" } });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "demo@example.com",
      password: "secret"
    });
  });

  it("login lanza error cuando supabase falla", async () => {
    const fakeError = new Error("Invalid credentials");
    signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: fakeError
    });

    const service = new AuthService();
    await expect(
      service.login({ email: "demo@example.com", password: "bad" })
    ).rejects.toThrow("Invalid credentials");
  });
});

