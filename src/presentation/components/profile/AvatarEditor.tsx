import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, Check, RotateCw } from "lucide-react";
import { Button } from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface AvatarEditorProps {
  imageSrc: string;
  onSave: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

/**
 * Editor de avatar con funcionalidad de recorte (crop).
 */
export function AvatarEditor({ imageSrc, onSave, onCancel }: AvatarEditorProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onCropComplete = React.useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener contexto del canvas");
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Error al crear imagen recortada"));
          }
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setLoading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onSave(croppedImage);
    } catch (error) {
      console.error("Error al recortar imagen:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onCancel();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Recortar imagen
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cropper */}
          <div className="relative h-96 w-full bg-gray-100 dark:bg-gray-900">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          </div>

          {/* Controls */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="space-y-4">
              {/* Zoom */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zoom: {Math.round(zoom * 100)}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Rotación */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rotación: {rotation}°
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    90°
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading || !croppedAreaPixels}>
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Aplicar
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

