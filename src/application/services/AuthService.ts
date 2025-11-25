import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { Logger } from "@infrastructure/logging/logger";

export interface LoginParams {
  email: string;
  password: string;
  rememberSession?: boolean;
}

export class AuthService {
  async login({ email, password, rememberSession = true }: LoginParams) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      Logger.warn("[auth] Login failed", error);
      throw error;
    }

    if (!rememberSession) {
      await supabaseClient.auth.setSession({
        access_token: data.session?.access_token ?? "",
        refresh_token: ""
      });
    }

    return data;
  }

  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      Logger.error("[auth] Logout failed", error);
      throw error;
    }
  }
}

