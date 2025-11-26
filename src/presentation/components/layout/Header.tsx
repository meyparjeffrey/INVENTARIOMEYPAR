import * as React from "react";
import { useAuth } from "../../context/AuthContext";
import { LanguageSelector, ThemeToggle, UserMenu } from "../ui";
import { GlobalSearch } from "../ui/GlobalSearch";
import { NotificationPanel } from "../ui/NotificationPanel";

/**
 * Header superior con búsqueda, controles y menú de usuario.
 */
export function Header() {
  const { authContext, logout } = useAuth();

  if (!authContext) {
    return null;
  }


  const handleProfileClick = () => {
    // TODO: Navegar a página de perfil
    // eslint-disable-next-line no-console
    console.log("Ver perfil");
  };

  const handleSettingsClick = () => {
    // TODO: Navegar a configuración
    // eslint-disable-next-line no-console
    console.log("Abrir configuración");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Búsqueda global */}
      <GlobalSearch placeholder="Buscar productos, lotes..." />

      {/* Controles */}
      <div className="flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
        <NotificationPanel />
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

