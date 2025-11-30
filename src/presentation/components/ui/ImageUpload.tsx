import { Upload, X, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (file: File | null) => void;
  onImageUploaded?: (url: string) => void;
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  bucket?: string;
  folder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Componente para subir imágenes con compresión automática.
 * Comprime la imagen hasta que sea menor al tamaño máximo especificado.
 */
export function ImageUpload({
  currentImageUrl,
  onImageChange,
  onImageUploaded,
  maxSizeKB = 500,
  maxWidth = 1024,
  maxHeight = 1024,
  bucket = "avatars",
  folder = "users",
  className,
  disabled = false
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Comprime una imagen usando canvas hasta que sea menor al tamaño máximo.
   */
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calcular dimensiones manteniendo proporción
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Crear canvas
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("No se pudo obtener contexto del canvas"));
            return;
          }

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir con calidad ajustable
          let quality = 0.9;
          const tryCompress = (q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Error al comprimir imagen"));
                  return;
                }

                const sizeKB = blob.size / 1024;
                if (sizeKB <= maxSizeKB || q <= 0.1) {
                  resolve(blob);
                } else {
                  // Reducir calidad y volver a intentar
                  tryCompress(q - 0.1);
                }
              },
              "image/jpeg",
              q
            );
          };

          tryCompress(quality);
        };
        img.onerror = () => reject(new Error("Error al cargar imagen"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error al leer archivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen (JPG, PNG)");
      return;
    }

    // Validar tamaño inicial (antes de comprimir)
    const initialSizeKB = file.size / 1024;
    if (initialSizeKB > maxSizeKB * 5) {
      setError(`La imagen es demasiado grande. Máximo: ${maxSizeKB * 5}KB`);
      return;
    }

    try {
      setUploading(true);

      // Comprimir imagen
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: "image/jpeg",
        lastModified: Date.now()
      });

      // Crear preview
      const previewUrl = URL.createObjectURL(compressedBlob);
      setPreview(previewUrl);

      // Notificar cambio
      onImageChange(compressedFile);

      // Si hay callback de subida, subir a Supabase
      if (onImageUploaded) {
        const url = await uploadToSupabase(compressedFile);
        onImageUploaded(url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al procesar imagen";
      setError(errorMessage);
      console.error("[ImageUpload] Error:", err);
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    const { supabaseClient } = await import("@infrastructure/supabase/supabaseClient");

    // Obtener userId desde session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user?.id) {
      throw new Error("No hay sesión activa");
    }

    // Usar userId en el nombre del archivo
    const fileName = `${session.user.id}-${Date.now()}.jpg`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true // Permitir sobrescribir si existe
      });

    if (error) {
      throw new Error(`Error al subir imagen: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        {/* Preview */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Eliminar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
            <Upload className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {/* Botón de subida */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="image-upload-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comprimiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {preview ? "Cambiar foto" : "Subir foto"}
              </>
            )}
          </Button>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Máximo {maxSizeKB}KB. Formatos: JPG, PNG
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

