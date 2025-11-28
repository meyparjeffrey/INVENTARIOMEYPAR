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

