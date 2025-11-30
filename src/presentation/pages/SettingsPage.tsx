import { ArrowLeft, Save, Palette, Bell, Scan, Eye, Globe, Moon, Layout, Calendar, List } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { motion } from "framer-motion";

/**
 * Página de configuración de usuario con todas las opciones personalizables.
 */
export function SettingsPage() {
  const { t } = useLanguage();
  const { authContext, refreshContext } = useAuth();
  const { theme, setTheme, primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor } = useTheme();
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);

  // Estado de configuración
  const [itemsPerPage, setItemsPerPage] = React.useState(authContext?.settings?.itemsPerPage || 25);
  const [dateFormat, setDateFormat] = React.useState(authContext?.settings?.dateFormat || "DD/MM/YYYY");
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    authContext?.settings?.notificationsEnabled ?? true
  );
  const [scannerSoundEnabled, setScannerSoundEnabled] = React.useState(
    authContext?.settings?.scannerSoundEnabled ?? true
  );
  const [scannerVibrationEnabled, setScannerVibrationEnabled] = React.useState(
    authContext?.settings?.scannerVibrationEnabled ?? true
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    authContext?.settings?.sidebarCollapsed ?? false
  );
  const [defaultMovementType, setDefaultMovementType] = React.useState(
    authContext?.settings?.defaultMovementType || "OUT"
  );

  // Cargar valores desde settings
  React.useEffect(() => {
    if (authContext?.settings) {
      setItemsPerPage(authContext.settings.itemsPerPage);
      setDateFormat(authContext.settings.dateFormat);
      setNotificationsEnabled(authContext.settings.notificationsEnabled);
      setScannerSoundEnabled(authContext.settings.scannerSoundEnabled);
      setScannerVibrationEnabled(authContext.settings.scannerVibrationEnabled);
      setSidebarCollapsed(authContext.settings.sidebarCollapsed);
      setDefaultMovementType(authContext.settings.defaultMovementType);
      
      // Cargar colores desde settings
      if (authContext.settings.primaryColor) {
        setPrimaryColor(authContext.settings.primaryColor);
      }
      if (authContext.settings.secondaryColor) {
        setSecondaryColor(authContext.settings.secondaryColor);
      }
    }
  }, [authContext?.settings, setPrimaryColor, setSecondaryColor]);

  const handleSave = async () => {
    if (!authContext) return;

    setSaving(true);
    try {
      // Guardar en Supabase
      const { error } = await supabaseClient
        .from("user_settings")
        .upsert(
          {
            user_id: authContext.profile.id,
            language: localStorage.getItem("language") || "ca-ES",
            theme_mode: theme,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            sidebar_collapsed: sidebarCollapsed,
            notifications_enabled: notificationsEnabled,
            scanner_sound_enabled: scannerSoundEnabled,
            scanner_vibration_enabled: scannerVibrationEnabled,
            default_movement_type: defaultMovementType,
            items_per_page: itemsPerPage,
            date_format: dateFormat,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      // Refrescar contexto
      await refreshContext();

      alert(t("settings.saveSuccess") || "Configuración guardada correctamente");
    } catch (error) {
      console.error("[SettingsPage] Error guardando configuración:", error);
      alert(t("settings.saveError") || "Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (!authContext) {
    return null;
  }

  const isAdmin = authContext.profile.role === "ADMIN";
  const isWarehouse = authContext.profile.role === "WAREHOUSE";

  return (
    <div className="space-y-6">
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
            {t("settings.subtitle") || "Personaliza tu experiencia"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Apariencia */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("settings.appearance") || "Apariencia"}
            </h2>
            <div className="space-y-6">
              {/* Idioma */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t("settings.language") || "Idioma"}
                  </Label>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("settings.languageDesc") || "Selecciona el idioma de la interfaz"}
                  </p>
                </div>
                <LanguageSelector />
              </div>

              {/* Tema */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t("settings.theme") || "Tema"}
                  </Label>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("settings.themeDesc") || "Elige entre tema claro u oscuro"}
                  </p>
                </div>
                <ThemeToggle />
              </div>

              {/* Color Principal */}
              <div>
                <Label htmlFor="primaryColor" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t("settings.primaryColor") || "Color Principal"}
                </Label>
                <p className="mt-1 mb-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.primaryColorDesc") || "Color principal de la aplicación"}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-12 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#e62144"
                  />
                </div>
              </div>

              {/* Color Secundario */}
              <div>
                <Label htmlFor="secondaryColor" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t("settings.secondaryColor") || "Color Secundario"}
                </Label>
                <p className="mt-1 mb-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("settings.secondaryColorDesc") || "Color secundario de la aplicación"}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-12 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#059669"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Preferencias de Interfaz */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <Layout className="h-5 w-5" />
              {t("settings.interface") || "Interfaz"}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="itemsPerPage" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  {t("settings.itemsPerPage") || "Elementos por página"}
                </Label>
                <Input
                  id="itemsPerPage"
                  type="number"
                  min="10"
                  max="100"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="dateFormat" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("settings.dateFormat") || "Formato de fecha"}
                </Label>
                <select
                  id="dateFormat"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.sidebarCollapsed") || "Sidebar colapsado"}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("settings.sidebarCollapsedDesc") || "Mostrar sidebar colapsado por defecto"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={sidebarCollapsed}
                  onChange={(e) => setSidebarCollapsed(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Notificaciones */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settings.notifications") || "Notificaciones"}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.notificationsEnabled") || "Activar notificaciones"}</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("settings.notificationsEnabledDesc") || "Recibir notificaciones del sistema"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Escáner (solo para WAREHOUSE y ADMIN) */}
          {(isWarehouse || isAdmin) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <Scan className="h-5 w-5" />
                {t("settings.scanner") || "Escáner"}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("settings.scannerSound") || "Sonido al escanear"}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("settings.scannerSoundDesc") || "Reproducir sonido al escanear códigos"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scannerSoundEnabled}
                    onChange={(e) => setScannerSoundEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("settings.scannerVibration") || "Vibración al escanear"}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("settings.scannerVibrationDesc") || "Vibrar al escanear códigos"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scannerVibrationEnabled}
                    onChange={(e) => setScannerVibrationEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Movimientos (solo para WAREHOUSE y ADMIN) */}
          {(isWarehouse || isAdmin) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t("settings.movements") || "Movimientos"}
              </h2>
              <div>
                <Label htmlFor="defaultMovementType">
                  {t("settings.defaultMovementType") || "Tipo de movimiento por defecto"}
                </Label>
                <select
                  id="defaultMovementType"
                  value={defaultMovementType}
                  onChange={(e) => setDefaultMovementType(e.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="IN">{t("settings.movementIn") || "Entrada"}</option>
                  <option value="OUT">{t("settings.movementOut") || "Salida"}</option>
                  <option value="ADJUSTMENT">{t("settings.movementAdjustment") || "Ajuste"}</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-4">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("settings.saving") || "Guardando..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("settings.save") || "Guardar cambios"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Columna lateral - Vista previa */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t("settings.preview") || "Vista previa"}
            </h3>
            <div className="space-y-3">
              <div
                className="rounded-md p-3 text-sm font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {t("settings.primaryColor") || "Color Principal"}
              </div>
              <div
                className="rounded-md p-3 text-sm font-medium text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                {t("settings.secondaryColor") || "Color Secundario"}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
