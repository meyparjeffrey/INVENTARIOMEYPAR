import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LanguageSelector, ThemeToggle, UserMenu, ConnectionStatus } from "../ui";
import { GlobalSearch } from "../ui/GlobalSearch";
import { NotificationPanel } from "../ui/NotificationPanel";

/**
 * Header superior con búsqueda, controles y menú de usuario.
 */
export function Header() {
  const { authContext, logout } = useAuth();
  const navigate = useNavigate();

  if (!authContext) {
    return null;
  }

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 shadow-sm transition-all duration-200 dark:border-gray-700 dark:bg-gray-800/95">
      {/* Búsqueda global - Ocupa más espacio en desktop, responsive */}
      <div className="flex-1 max-w-2xl min-w-0">
        <GlobalSearch placeholder="Buscar productos, lotes..." />
      </div>

      {/* Separador visual - Solo en desktop */}
      <div className="hidden h-8 w-px bg-gray-200 dark:bg-gray-700 md:block" />

      {/* Controles - Agrupados lógicamente con mejor espaciado */}
      <div className="flex items-center gap-2">
        {/* Estado de conexión - Menos prominente, solo desktop */}
        <div className="hidden lg:block">
          <ConnectionStatus />
        </div>
        
        {/* Idioma y tema - Agrupados con mejor diseño */}
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50/50 p-0.5 dark:border-gray-700 dark:bg-gray-900/50">
          <LanguageSelector />
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <ThemeToggle />
        </div>

        {/* Notificaciones */}
        <NotificationPanel />

        {/* Separador antes del usuario */}
        <div className="hidden h-8 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Usuario - Más prominente */}
        <UserMenu
          name={`${authContext.profile.firstName} ${authContext.profile.lastName}`}
          initials={authContext.profile.initials}
          avatarUrl={authContext.profile.avatarUrl}
          role={authContext.profile.role}
          onLogout={logout}
          onProfile={handleProfileClick}
          onSettings={handleSettingsClick}
        />
      </div>
    </header>
  );
}

