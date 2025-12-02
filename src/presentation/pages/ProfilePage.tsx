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
import { useLanguage } from "../context/LanguageContext";
import { SupabaseUserRepository } from "@infrastructure/repositories/SupabaseUserRepository";
import { uploadAvatar, deleteAvatar } from "@infrastructure/storage/avatarStorage";
import { AvatarUpload } from "../components/profile/AvatarUpload";
import { AvatarEditor } from "../components/profile/AvatarEditor";
import { ProfileFormField } from "../components/profile/ProfileFormField";

/**
 * Página de perfil de usuario con formulario editable y mejoras profesionales.
 */
export function ProfilePage() {
  const { t } = useLanguage();
  const { authContext, refreshContext } = useAuth();
  const navigate = useNavigate();
  const userRepository = React.useMemo(() => new SupabaseUserRepository(), []);

  const [loading, setLoading] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [showCropEditor, setShowCropEditor] = React.useState(false);
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

  // Estados del formulario
  const [firstName, setFirstName] = React.useState(authContext?.profile.firstName || "");
  const [lastName, setLastName] = React.useState(authContext?.profile.lastName || "");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    authContext?.profile.avatarUrl || null
  );

  // Estado para preview de avatar (antes de crop)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  // Validación en tiempo real
  const validateName = (name: string): { isValid: boolean; message?: string } => {
    if (name.length === 0) {
      return { isValid: false, message: "Este campo es obligatorio" };
    }
    if (name.length < 2) {
      return { isValid: false, message: "Debe tener al menos 2 caracteres" };
    }
    if (name.length > 50) {
      return { isValid: false, message: "No puede exceder 50 caracteres" };
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
      return { isValid: false, message: "Solo se permiten letras, espacios, guiones y apostrofes" };
    }
    return { isValid: true, message: "Nombre válido" };
  };

  const firstNameValidation = React.useMemo(
    () => validateName(firstName),
    [firstName]
  );
  const lastNameValidation = React.useMemo(
    () => validateName(lastName),
    [lastName]
  );

  // Sincronizar estados cuando cambia authContext
  React.useEffect(() => {
    if (authContext) {
      setFirstName(authContext.profile.firstName);
      setLastName(authContext.profile.lastName);
      setAvatarUrl(authContext.profile.avatarUrl || null);
      setAvatarPreview(null);
    }
  }, [authContext]);

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
      setError("Formato no válido. Solo se permiten JPG y PNG.");
      return;
    }

    if (file.size > 500 * 1024 * 2) {
      setError("El archivo es demasiado grande. Máximo 1MB.");
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
      const errorMessage = err instanceof Error ? err.message : "Error al subir avatar";
      setError(errorMessage);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      setImageToCrop(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!authContext || !avatarUrl) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      // Eliminar de Storage
      await deleteAvatar(authContext.profile.id, avatarUrl);

      // Actualizar perfil
      await userRepository.updateProfile(authContext.profile.id, {
        avatarUrl: null
      });

      setAvatarUrl(null);
      setAvatarPreview(null);
      await refreshContext();
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar avatar";
      setError(errorMessage);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!authContext) return;

    // Validar antes de guardar
    if (!firstNameValidation.isValid || !lastNameValidation.isValid) {
      setError("Por favor, corrige los errores en el formulario antes de guardar.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await userRepository.updateProfile(authContext.profile.id, {
        firstName,
        lastName
      });

      // Refrescar contexto
      await refreshContext();
      setSuccess(true);

      // Si hay preview de avatar, ya se guardó arriba, solo limpiar preview
      if (avatarPreview) {
        setAvatarPreview(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al guardar perfil";
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
      avatarPreview !== null
    );
  }, [authContext, firstName, lastName, avatarPreview]);

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
              {t("user.profile")}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gestiona tu información personal
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
                ✅ Cambios guardados correctamente
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
              onRemove={handleRemoveAvatar}
              uploading={uploadingAvatar}
              disabled={loading}
            />

            {/* Campos con validación en tiempo real */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileFormField
                id="firstName"
                label="Nombre"
                value={firstName}
                onChange={setFirstName}
                disabled={loading}
                validation={firstNameValidation}
                maxLength={50}
                showCharCount
              />
              <ProfileFormField
                id="lastName"
                label="Apellidos"
                value={lastName}
                onChange={setLastName}
                disabled={loading}
                validation={lastNameValidation}
                maxLength={50}
                showCharCount
              />
            </div>

            <div>
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                id="username"
                type="email"
                value={userEmail}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                El nombre de usuario no se puede modificar
              </p>
            </div>

            <div>
              <Label htmlFor="role">Rol</Label>
              <Input
                id="role"
                value={authContext.profile.role}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={handleCancelClick}
              disabled={loading || uploadingAvatar}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || uploadingAvatar || !hasChanges || !isFormValid}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
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
            <DialogTitle>¿Descartar cambios?</DialogTitle>
            <DialogDescription>
              Tienes cambios sin guardar. ¿Estás seguro de que quieres descartarlos y salir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCancelDialog(false)}>
              Continuar editando
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              Descartar cambios
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
