import { supabaseClient } from "../supabase/supabaseClient";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

/**
 * Comprime una imagen a un tamaño máximo manteniendo la proporción.
 */
function compressImage(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensionar si es necesario
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener contexto del canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Intentar comprimir hasta que sea menor a MAX_FILE_SIZE
        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Error al comprimir imagen"));
                return;
              }

              if (blob.size <= MAX_FILE_SIZE || currentQuality <= 0.1) {
                resolve(blob);
              } else {
                currentQuality -= 0.1;
                tryCompress();
              }
            },
            "image/jpeg",
            currentQuality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error("Error al cargar imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un avatar a Supabase Storage y devuelve la URL pública.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  // Validar tipo de archivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato no válido. Solo se permiten JPG y PNG.");
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE * 2) {
    throw new Error(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024}KB.`);
  }

  // Comprimir imagen
  const compressedBlob = await compressImage(file);

  // Generar nombre único para el archivo
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Subir a Supabase Storage
  const { data, error } = await supabaseClient.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, compressedBlob, {
      contentType: "image/jpeg",
      upsert: true
    });

  if (error) {
    throw new Error(`Error al subir avatar: ${error.message}`);
  }

  // Obtener URL pública
  const {
    data: { publicUrl }
  } = supabaseClient.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Elimina un avatar de Supabase Storage.
 */
export async function deleteAvatar(userId: string, avatarUrl: string): Promise<void> {
  try {
    // Extraer el path del archivo desde la URL
    const urlParts = avatarUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabaseClient.storage
      .from(AVATAR_BUCKET)
      .remove([filePath]);

    if (error) {
      // eslint-disable-next-line no-console
      console.warn("Error al eliminar avatar antiguo:", error);
      // No lanzar error, solo loguear
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Error al eliminar avatar:", error);
    // No lanzar error, solo loguear
  }
}

