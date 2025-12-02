import { LogOut, Settings, User } from "lucide-react";
import * as React from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
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
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  // Obtener configuración de avatar desde user_settings
  const avatarSettings = authContext?.settings;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 gap-2 px-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
        title={`${name} (${role || "Usuario"})`}
      >
        <Avatar
          name={name}
          initials={initials}
          imageUrl={avatarUrl}
          size={avatarSettings?.avatarSize || "sm"}
          customSize={avatarSettings?.avatarCustomSize ?? undefined}
          borderEnabled={avatarSettings?.avatarBorderEnabled}
          borderWidth={avatarSettings?.avatarBorderWidth}
          borderColor={avatarSettings?.avatarBorderColor}
          shadowEnabled={avatarSettings?.avatarShadowEnabled}
          shadowIntensity={avatarSettings?.avatarShadowIntensity}
          shape={avatarSettings?.avatarShape}
          animationEnabled={avatarSettings?.avatarAnimationEnabled}
        />
        <span className="hidden text-sm font-medium md:inline-block">{name}</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
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
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md"
                >
                  <User className="h-4 w-4 transition-transform group-hover:scale-110" />
                  {t("user.profile")}
                </button>
              )}
              {onSettings && (
                <button
                  onClick={() => {
                    onSettings();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md"
                >
                  <Settings className="h-4 w-4 transition-transform group-hover:scale-110" />
                  {t("user.settings")}
                </button>
              )}
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
              >
                <LogOut className="h-4 w-4" />
                {t("user.logout")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

