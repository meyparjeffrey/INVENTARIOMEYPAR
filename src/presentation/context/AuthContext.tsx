import * as React from "react";
import type { AuthContext as AuthContextType } from "@application/services/AuthService";
import { AuthService } from "@application/services/AuthService";

interface AuthContextValue {
  authContext: AuthContextType | null;
  loading: boolean;
  login: (email: string, password: string, rememberSession?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshContext: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/**
 * Provider de autenticación que gestiona el estado de sesión y proporciona funciones de login/logout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authContext, setAuthContext] = React.useState<AuthContextType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const authService = React.useMemo(() => new AuthService(), []);

  // Intentar recuperar sesión al montar
  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const context = await authService.getCurrentContext();
        setAuthContext(context);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[AuthContext] No hay sesión activa", error);
        setAuthContext(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [authService]);

  const login = React.useCallback(
    async (email: string, password: string, rememberSession = true) => {
      const context = await authService.login({ email, password, rememberSession });
      setAuthContext(context);
      
      // Sincronizar idioma desde user_settings después del login
      if (context.settings?.language) {
        const storedLanguage = localStorage.getItem("language");
        const settingsLanguage = context.settings.language;
        
        // Si el idioma en Supabase es diferente al de localStorage, usar el de Supabase
        if (storedLanguage !== settingsLanguage) {
          localStorage.setItem("language", settingsLanguage);
          // Disparar evento para que LanguageContext se actualice
          window.dispatchEvent(new CustomEvent("language-changed", { detail: settingsLanguage }));
        }
      } else {
        // Si no hay settings, crear con el idioma actual de localStorage
        const currentLanguage = localStorage.getItem("language") || "ca-ES";
        try {
          const { supabaseClient } = await import("@infrastructure/supabase/supabaseClient");
          await supabaseClient
            .from("user_settings")
            .upsert({
              user_id: context.profile.id,
              language: currentLanguage,
              updated_at: new Date().toISOString()
            }, {
              onConflict: "user_id"
            });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("[AuthContext] Error creando user_settings:", error);
        }
      }
    },
    [authService]
  );

  const logout = React.useCallback(async () => {
    try {
      await authService.logout();
      setAuthContext(null);
      // Forzar navegación a /login después del logout
      const isElectron = window.location.protocol === "file:";
      if (isElectron) {
        window.location.hash = "#/login";
      } else {
        window.location.href = "/login";
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[AuthContext] Error al cerrar sesión", error);
      // Aún así, limpiar el contexto local
      setAuthContext(null);
    }
  }, [authService]);

  const refreshContext = React.useCallback(async () => {
    try {
      const context = await authService.getCurrentContext();
      setAuthContext(context);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[AuthContext] Error al refrescar contexto", error);
      setAuthContext(null);
    }
  }, [authService]);

  return (
    <AuthContext.Provider value={{ authContext, loading, login, logout, refreshContext }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación.
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

