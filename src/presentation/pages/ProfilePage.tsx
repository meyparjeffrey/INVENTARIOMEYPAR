import { ArrowLeft, Save, Mail, Shield, Calendar, User as UserIcon, Key, Bell, Eye } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Avatar } from "../components/ui/Avatar";
import { ImageUpload } from "../components/ui/ImageUpload";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { motion } from "framer-motion";

/**
 * Página de perfil de usuario con formulario editable.
 * Incluye opciones según el rol del usuario.
 */
export function ProfilePage() {
  const { t } = useLanguage();
  const { authContext, refreshContext } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [firstName, setFirstName] = React.useState(authContext?.profile.firstName || "");
  const [lastName, setLastName] = React.useState(authContext?.profile.lastName || "");
  const [avatarUrl, setAvatarUrl] = React.useState(authContext?.profile.avatarUrl || null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [email, setEmail] = React.useState<string>("");
  const [lastLogin, setLastLogin] = React.useState<string>("");

  // Cargar email y último login
  React.useEffect(() => {
    if (authContext) {
      // Obtener email desde session
      const userEmail = authContext.session?.user?.email || "";
      setEmail(userEmail);
      setFirstName(authContext.profile.firstName);
      setLastName(authContext.profile.lastName);
      setAvatarUrl(authContext.profile.avatarUrl);

      // Obtener último login
      loadLastLogin();
    }
  }, [authContext]);

  const loadLastLogin = async () => {
    if (!authContext?.profile.id) return;
    try {
      const { data } = await supabaseClient
        .from("user_login_events")
        .select("login_at")
        .eq("user_id", authContext.profile.id)
        .eq("success", true)
        .order("login_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.login_at) {
        setLastLogin(new Date(data.login_at).toLocaleString());
      }
    } catch (error) {
      console.error("[ProfilePage] Error cargando último login:", error);
    }
  };

  const handleImageChange = (file: File | null) => {
    setAvatarFile(file);
  };

  const handleImageUploaded = async (url: string) => {
    setAvatarUrl(url);
    // Actualizar perfil con nueva URL
    if (authContext?.profile.id) {
      try {
        await supabaseClient
          .from("profiles")
          .update({ avatar_url: url, updated_at: new Date().toISOString() })
          .eq("id", authContext.profile.id);
      } catch (error) {
        console.error("[ProfilePage] Error actualizando avatar:", error);
      }
    }
  };

  const handleSave = async () => {
    if (!authContext) return;

    setSaving(true);
    try {
      // Actualizar perfil
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", authContext.profile.id);

      if (profileError) throw profileError;

      // Si hay nueva imagen, ya debería estar subida por ImageUpload
      // Solo actualizamos la URL si se proporcionó
      if (avatarUrl && avatarUrl !== authContext.profile.avatarUrl) {
        // La URL ya está actualizada por handleImageUploaded
      }

      // Refrescar contexto
      await refreshContext();

      // Mostrar mensaje de éxito (podrías usar un toast aquí)
      alert(t("profile.saveSuccess") || "Perfil actualizado correctamente");
    } catch (error) {
      console.error("[ProfilePage] Error guardando perfil:", error);
      alert(t("profile.saveError") || "Error al guardar el perfil");
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t("user.profile")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("profile.subtitle") || "Gestiona tu información personal"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal - Información personal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              {t("profile.basicInfo") || "Información Básica"}
            </h2>
            <div className="space-y-6">
              {/* Avatar */}
              <div>
                <Label>{t("profile.avatar") || "Foto de perfil"}</Label>
                <div className="mt-2">
                  <ImageUpload
                    currentImageUrl={avatarUrl}
                    onImageChange={handleImageChange}
                    onImageUploaded={handleImageUploaded}
                    maxSizeKB={500}
                    bucket="avatars"
                    folder="users"
                  />
                </div>
              </div>

              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">{t("profile.firstName") || "Nombre"}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t("profile.lastName") || "Apellidos"}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email (solo lectura) */}
              <div>
                <Label htmlFor="email">{t("profile.email") || "Correo electrónico"}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-10 bg-gray-50 dark:bg-gray-900"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {email || t("profile.emailNotAvailable") || "Correo no disponible"}
                </p>
              </div>

              {/* Rol */}
              <div>
                <Label htmlFor="role">{t("profile.role") || "Rol"}</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="role"
                    value={authContext.profile.role}
                    disabled
                    className="pl-10 bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Información de cuenta (solo para algunos roles) */}
          {(isAdmin || isWarehouse) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("profile.accountInfo") || "Información de Cuenta"}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label>{t("profile.memberSince") || "Miembro desde"}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={new Date(authContext.profile.createdAt).toLocaleDateString()}
                      disabled
                      className="pl-10 bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                </div>
                {lastLogin && (
                  <div>
                    <Label>{t("profile.lastLogin") || "Último acceso"}</Label>
                    <Input
                      value={lastLogin}
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                )}
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
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("profile.saving") || "Guardando..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("profile.save") || "Guardar cambios"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Columna lateral - Resumen */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col items-center text-center">
              <Avatar
                name={`${firstName} ${lastName}`}
                initials={authContext.profile.initials}
                imageUrl={avatarUrl}
                size="xl"
              />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
                {firstName} {lastName}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {email || t("profile.emailNotAvailable")}
              </p>
              <div className="mt-3">
                <span className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                  {authContext.profile.role}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Estadísticas rápidas (solo para algunos roles) */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
                {t("profile.quickStats") || "Estadísticas"}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("profile.permissions") || "Permisos"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-50">
                    {authContext.permissions.length}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
