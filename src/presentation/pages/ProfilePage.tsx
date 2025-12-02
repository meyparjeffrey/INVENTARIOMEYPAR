import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/ui/Dialog";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { SupabaseUserRepository } from "@infrastructure/repositories/SupabaseUserRepository";
import { uploadAvatar, deleteAvatar } from "@infrastructure/storage/avatarStorage";
import { AvatarUpload } from "../components/profile/AvatarUpload";
import { AvatarEditor } from "../components/profile/AvatarEditor";
import { ProfileFormField } from "../components/profile/ProfileFormField";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

/**
 * Página de perfil de usuario con formulario editable y mejoras profesionales.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { authContext, refreshContext, updateProfileOptimistic } = useAuth();
  const navigate = useNavigate();
  const userRepository = React.useMemo(() => new SupabaseUserRepository(), []);

  const [loading, setLoading] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [showDeleteAvatarDialog, setShowDeleteAvatarDialog] = React.useState(false);
  const [showCropEditor, setShowCropEditor] = React.useState(false);
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

  // Estados del formulario
  const [firstName, setFirstName] = React.useState(authContext?.profile.firstName || "");
  const [lastName, setLastName] = React.useState(authContext?.profile.lastName || "");
  const [initials, setInitials] = React.useState(authContext?.profile.initials || "");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    authContext?.profile.avatarUrl || null
  );

  // Estado para preview de avatar (antes de crop)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  // Validación en tiempo real
  const validateName = (name: string, field: "firstName" | "lastName"): { isValid: boolean; message?: string } => {
    if (name.length === 0) {
      return { isValid: false, message: t(`validation.${field}.required`) };
    }
    if (name.length < 2) {
      return { isValid: false, message: t(`validation.${field}.minLength`) };
    }
    if (name.length > 50) {
      return { isValid: false, message: t(`validation.${field}.maxLength`) };
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
      return { isValid: false, message: t(`validation.${field}.invalid`) };
    }
    return { isValid: true, message: t(`validation.${field}.valid`) };
  };

  const firstNameValidation = React.useMemo(
    () => validateName(firstName, "firstName"),
    [firstName, t]
  );
  const lastNameValidation = React.useMemo(
    () => validateName(lastName, "lastName"),
    [lastName, t]
  );

  // Sincronizar estados cuando cambia authContext
  React.useEffect(() => {
    if (authContext) {
      setFirstName(authContext.profile.firstName);
      setLastName(authContext.profile.lastName);
      setInitials(authContext.profile.initials || "");
      setAvatarUrl(authContext.profile.avatarUrl || null);
      setAvatarPreview(null);
    }
  }, [authContext]);

  // Suscripción Realtime para sincronización bidireccional con Supabase
  React.useEffect(() => {
    if (!authContext) return;

    const channel = supabaseClient
      .channel(`profile-${authContext.profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${authContext.profile.id}`
        },
        (payload) => {
          // Cuando hay cambios en Supabase, actualizar el contexto local
          const updatedProfile = payload.new as {
            first_name: string;
            last_name: string;
            initials: string;
            avatar_url: string | null;
            role: string;
            updated_at: string;
          };
          
          // Si cambió el rol, refrescar el contexto completo para actualizar permisos
          if (updatedProfile.role !== authContext.profile.role) {
            // eslint-disable-next-line no-console
            console.log("[ProfilePage] Rol cambiado, refrescando contexto completo");
            void refreshContext();
            return;
          }

          // Actualizar contexto optimista
          updateProfileOptimistic({
            firstName: updatedProfile.first_name,
            lastName: updatedProfile.last_name,
            initials: updatedProfile.initials,
            avatarUrl: updatedProfile.avatar_url || undefined,
            role: updatedProfile.role as "ADMIN" | "WAREHOUSE" | "VIEWER",
            updatedAt: updatedProfile.updated_at
          });

          // Sincronizar estados locales
          setFirstName(updatedProfile.first_name);
          setLastName(updatedProfile.last_name);
          setInitials(updatedProfile.initials);
          setAvatarUrl(updatedProfile.avatar_url || null);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [authContext, updateProfileOptimistic]);

  // Resetear mensajes después de 3 segundos
  React.useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(false);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleFileSelect = (file: File) => {
    // Validar archivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setError(t("profile.error.upload") + ": " + t("profile.photoHelp"));
      return;
    }

    if (file.size > 500 * 1024 * 2) {
      setError(t("profile.error.upload") + ": " + t("profile.photoHelp"));
      return;
    }

    // Crear preview y abrir editor de crop
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setImageToCrop(imageSrc);
      setShowCropEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!authContext) return;

    setShowCropEditor(false);
    setUploadingAvatar(true);
    setError(null);

    try {
      // Crear File desde Blob
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a Supabase Storage
      const newAvatarUrl = await uploadAvatar(authContext.profile.id, file);
      setAvatarUrl(newAvatarUrl);

      // Actualizar perfil en la base de datos
      await userRepository.updateProfile(authContext.profile.id, {
        avatarUrl: newAvatarUrl
      });

      // Refrescar contexto para actualizar avatar en toda la app
      await refreshContext();
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("profile.error.upload");
      setError(errorMessage);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      setImageToCrop(null);
    }
  };

  const handleRemoveAvatarClick = () => {
    if (!avatarUrl) return;
    setShowDeleteAvatarDialog(true);
  };

  const handleRemoveAvatarConfirm = async () => {
    if (!authContext || !avatarUrl) return;

    setShowDeleteAvatarDialog(false);
    setUploadingAvatar(true);
    setError(null);
    setSuccess(false);

    try {
      // Eliminar de Storage
      await deleteAvatar(authContext.profile.id, avatarUrl);

      // Actualizar perfil
      await userRepository.updateProfile(authContext.profile.id, {
        avatarUrl: null
      });

      // Actualizar estados locales inmediatamente
      setAvatarUrl(null);
      setAvatarPreview(null);
      
      // Refrescar contexto en segundo plano
      await refreshContext();
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("profile.error.remove");
      setError(errorMessage);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!authContext) return;

    // Validar antes de guardar
    if (!firstNameValidation.isValid || !lastNameValidation.isValid) {
      setError(t("profile.error.validation"));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Actualizar estados locales INMEDIATAMENTE para feedback instantáneo
      // Los estados ya tienen los valores correctos (firstName, lastName)
      // Solo necesitamos guardarlos en la BD
      
      const updatedProfile = await userRepository.updateProfile(authContext.profile.id, {
        firstName,
        lastName,
        initials
      });

      // Actualizar el contexto de forma optimista INMEDIATAMENTE
      // Esto hace que el Header y otros componentes se actualicen al instante
      updateProfileOptimistic({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        initials: updatedProfile.initials,
        updatedAt: updatedProfile.updatedAt
      });

      // Refrescar contexto completo en segundo plano para sincronizar todos los datos
      // No esperamos a que termine para dar feedback inmediato
      refreshContext().catch(err => {
        // eslint-disable-next-line no-console
        console.warn("[ProfilePage] Error al refrescar contexto:", err);
      });
      
      setSuccess(true);

      // Si hay preview de avatar, ya se guardó arriba, solo limpiar preview
      if (avatarPreview) {
        setAvatarPreview(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("profile.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (hasChanges) {
      setShowCancelDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleCancelConfirm = () => {
    // Restaurar valores originales
    if (authContext) {
      setFirstName(authContext.profile.firstName);
      setLastName(authContext.profile.lastName);
      setAvatarUrl(authContext.profile.avatarUrl || null);
      setAvatarPreview(null);
    }
    setError(null);
    setSuccess(false);
    setShowCancelDialog(false);
    navigate(-1);
  };

      const hasChanges = React.useMemo(() => {
        if (!authContext) return false;
        return (
          firstName !== authContext.profile.firstName ||
          lastName !== authContext.profile.lastName ||
          initials !== (authContext.profile.initials || "") ||
          avatarPreview !== null
        );
      }, [authContext, firstName, lastName, initials, avatarPreview]);

  const isFormValid = firstNameValidation.isValid && lastNameValidation.isValid;

  if (!authContext) {
    return null;
  }

  const displayAvatarUrl = avatarPreview || avatarUrl;
  const userEmail = authContext.session.user.email || "";

  return (
    <>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {t("profile.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("profile.subtitle")}
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
                ✅ {t("profile.success")}
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
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-6">
            {/* Avatar con drag & drop */}
            <AvatarUpload
              avatarUrl={displayAvatarUrl}
              initials={authContext.profile.initials}
              name={`${firstName} ${lastName}`}
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveAvatarClick}
              uploading={uploadingAvatar}
              disabled={loading}
            />

            {/* Campos con validación en tiempo real */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileFormField
                id="firstName"
                label={t("profile.firstName")}
                value={firstName}
                onChange={setFirstName}
                disabled={loading}
                validation={firstNameValidation}
                maxLength={50}
                showCharCount
              />
              <ProfileFormField
                id="lastName"
                label={t("profile.lastName")}
                value={lastName}
                onChange={setLastName}
                disabled={loading}
                validation={lastNameValidation}
                maxLength={50}
                showCharCount
              />
            </div>

            <div>
              <Label htmlFor="username">{t("profile.username")}</Label>
              <Input
                id="username"
                type="email"
                value={userEmail}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("profile.usernameHelp")}
              </p>
            </div>

            <div>
              <Label htmlFor="role">{t("profile.role")}</Label>
              <Input
                id="role"
                value={authContext.profile.role}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("profile.roleHelp")}
              </p>
            </div>

            {/* Campo de iniciales */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="initials">{t("profile.initials")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Auto-generar iniciales desde nombre y apellido
                    const autoInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                    setInitials(autoInitials);
                  }}
                  className="h-7 text-xs"
                >
                  {t("profile.initialsAuto")}
                </Button>
              </div>
              <Input
                id="initials"
                value={initials}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 2);
                  setInitials(value);
                }}
                disabled={loading}
                maxLength={2}
                className="bg-white dark:bg-gray-800 uppercase"
                placeholder="JB"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("profile.initialsHelp")}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleCancelClick}
            disabled={loading || uploadingAvatar}
          >
            {t("profile.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || uploadingAvatar || !hasChanges || !isFormValid}
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("profile.saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("profile.save")}
              </>
            )}
          </Button>
          </div>
        </div>
      </motion.div>

      {/* Dialog de confirmación de cancelación */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("profile.cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("profile.cancelDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCancelDialog(false)}>
              {t("profile.cancelDialog.continue")}
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              {t("profile.cancelDialog.discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar avatar */}
      <Dialog open={showDeleteAvatarDialog} onOpenChange={setShowDeleteAvatarDialog}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("profile.deleteAvatar.title")}</DialogTitle>
            <DialogDescription>
              {t("profile.deleteAvatar.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteAvatarDialog(false)}>
              {t("profile.deleteAvatar.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRemoveAvatarConfirm}>
              {t("profile.deleteAvatar.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor de crop */}
      {showCropEditor && imageToCrop && (
        <AvatarEditor
          imageSrc={imageToCrop}
          onSave={handleCropComplete}
          onCancel={() => {
            setShowCropEditor(false);
            setImageToCrop(null);
          }}
        />
      )}
    </>
  );
}
