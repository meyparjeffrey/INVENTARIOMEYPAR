import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { useTranslation } from "../../hooks/useTranslation";
import { useAuth } from "../../context/AuthContext";

interface AvatarUploadProps {
  avatarUrl: string | null;
  initials: string;
  name: string;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
  disabled?: boolean;
}

/**
 * Componente de avatar con drag & drop y efectos hover.
 */
export function AvatarUpload({
  avatarUrl,
  initials,
  name,
  onFileSelect,
  onRemove,
  uploading = false,
  disabled = false
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const { authContext } = useAuth();

  // Obtener configuración de avatar desde user_settings
  const avatarSettings = authContext?.settings;

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0] && !disabled && !uploading) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect, disabled, uploading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
    multiple: false,
    disabled: disabled || uploading,
    maxSize: 500 * 1024 // 500KB
  });

  const displayUrl = avatarUrl || undefined;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-6">
      {/* Avatar con drag & drop */}
      <div
        {...getRootProps()}
        className="group relative cursor-pointer"
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <Avatar
            name={name}
            initials={initials}
            imageUrl={displayUrl}
            size={avatarSettings?.avatarSize || "lg"}
            customSize={avatarSettings?.avatarCustomSize ?? undefined}
            borderEnabled={avatarSettings?.avatarBorderEnabled}
            borderWidth={avatarSettings?.avatarBorderWidth}
            borderColor={avatarSettings?.avatarBorderColor}
            shadowEnabled={avatarSettings?.avatarShadowEnabled}
            shadowIntensity={avatarSettings?.avatarShadowIntensity}
            shape={avatarSettings?.avatarShape}
            animationEnabled={avatarSettings?.avatarAnimationEnabled}
            className="h-24 w-24 text-lg transition-all duration-200"
          />

          {/* Indicador de carga */}
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </motion.div>
          )}

          {/* Indicador de drag active */}
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-primary-500/80"
            >
              <Upload className="h-8 w-8 text-white" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Controles */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled && !uploading && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={disabled || uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? t("profile.uploading") : t("profile.changePhoto")}
          </Button>
          {displayUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={disabled || uploading}
              className="gap-2 text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <X className="h-4 w-4" />
              {t("profile.removePhoto")}
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isDragActive ? t("profile.dragActive") : t("profile.photoHelp")}
        </p>
      </div>
    </div>
  );
}

