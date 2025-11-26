import { LogOut, Settings, User } from "lucide-react";
import * as React from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

interface UserMenuProps {
  name: string;
  initials?: string;
  avatarUrl?: string | null;
  role?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
}

/**
 * Menú dropdown de usuario con avatar, nombre y opciones.
 */
export function UserMenu({
  name,
  initials,
  avatarUrl,
  role,
  onLogout,
  onProfile,
  onSettings
}: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 gap-2 px-2"
      >
        <Avatar name={name} initials={initials} imageUrl={avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium md:inline-block">{name}</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{name}</p>
              {role && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
              )}
            </div>
            <div className="py-1">
              {onProfile && (
                <button
                  onClick={() => {
                    onProfile();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <User className="h-4 w-4" />
                  Perfil
                </button>
              )}
              {onSettings && (
                <button
                  onClick={() => {
                    onSettings();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  Configuración
                </button>
              )}
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

