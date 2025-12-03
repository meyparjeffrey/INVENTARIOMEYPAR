import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { AvatarSettings } from "../components/settings/AvatarSettings";
import { SupabaseUserRepository } from "@infrastructure/repositories/SupabaseUserRepository";

/**
 * Página de configuración de usuario.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const { authContext, refreshContext } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const userRepository = React.useMemo(() => new SupabaseUserRepository(), []);

  // Estado local de configuración
  const [localSettings, setLocalSettings] = React.useState(authContext?.settings || null);

  React.useEffect(() => {
    if (authContext?.settings) {
      setLocalSettings(authContext.settings);
    }
  }, [authContext]);

  const handleSettingsChange = React.useCallback((updates: Partial<typeof localSettings>) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, ...updates });
    }
  }, [localSettings]);

  const handleSave = async () => {
    if (!authContext || !localSettings) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await userRepository.updateSettings(authContext.profile.id, {
        language: localSettings.language,
        themeMode: localSettings.themeMode,
        sidebarCollapsed: localSettings.sidebarCollapsed,
        notificationsEnabled: localSettings.notificationsEnabled,
        scannerSoundEnabled: localSettings.scannerSoundEnabled,
        scannerVibrationEnabled: localSettings.scannerVibrationEnabled,
        defaultMovementType: localSettings.defaultMovementType,
        itemsPerPage: localSettings.itemsPerPage,
        dateFormat: localSettings.dateFormat,
        // Avatar settings
        avatarSize: localSettings.avatarSize,
        avatarCustomSize: localSettings.avatarCustomSize,
        avatarBorderEnabled: localSettings.avatarBorderEnabled,
        avatarBorderWidth: localSettings.avatarBorderWidth,
        avatarBorderColor: localSettings.avatarBorderColor,
        avatarShadowEnabled: localSettings.avatarShadowEnabled,
        avatarShadowIntensity: localSettings.avatarShadowIntensity,
        avatarShape: localSettings.avatarShape,
        avatarAnimationEnabled: localSettings.avatarAnimationEnabled
      });

      await refreshContext();
      setSuccess(true);
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("settings.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!authContext || !localSettings) {
    return null;
  }

  const hasChanges = React.useMemo(() => {
    if (!authContext.settings) return false;
    return JSON.stringify(localSettings) !== JSON.stringify(authContext.settings);
  }, [authContext.settings, localSettings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-9 w-9 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t("user.settings")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.subtitle")}
          </p>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
          >
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ {t("settings.success")}
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulario */}
      <div className="space-y-6">
        {/* Configuración de Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("settings.avatar.title")}
          </h2>
          <AvatarSettings
            settings={localSettings}
            profileName={`${authContext.profile.firstName} ${authContext.profile.lastName}`}
            profileInitials={authContext.profile.initials}
            profileAvatarUrl={authContext.profile.avatarUrl}
            onChange={handleSettingsChange}
          />
        </motion.div>

        {/* Preferencias de idioma y tema */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("settings.appearance.title")}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("settings.appearance.language")}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.appearance.languageHelp")}
                </p>
              </div>
              <LanguageSelector />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("settings.appearance.theme")}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.appearance.themeHelp")}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </motion.div>

        {/* Otras configuraciones */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t("settings.preferences.title")}
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="itemsPerPage">{t("settings.preferences.itemsPerPage")}</Label>
              <Input
                id="itemsPerPage"
                type="number"
                min="10"
                max="100"
                value={localSettings.itemsPerPage}
                onChange={(e) => handleSettingsChange({ itemsPerPage: parseInt(e.target.value, 10) || 25 })}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("settings.preferences.itemsPerPageHelp")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("common.saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("settings.save")}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

