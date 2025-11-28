import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper para rutas que requieren autenticación.
 * SEGURIDAD MEJORADA: Solo permite acceso si hay un authContext válido.
 * El AuthContext ya maneja la verificación de sesión recordada.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authContext, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // SEGURIDAD: Si no hay authContext, redirigir a login
  // El AuthContext ya verifica si hay sesión válida al iniciar
  if (!authContext) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

