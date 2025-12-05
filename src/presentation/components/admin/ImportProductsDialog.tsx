import * as React from "react";
import { Upload, X, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { cn } from "../../lib/cn";

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ code: string; reason: string }>;
  skipped: number;
  validationErrors: Array<{ row: number; code?: string; reason: string }>;
  duration: number;
}

interface ImportProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportProductsDialog({ isOpen, onClose }: ImportProductsDialogProps) {
  const { t } = useLanguage();
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [overwriteExisting, setOverwriteExisting] = React.useState(false); // Por defecto: solo nuevos
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar extensión
    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      setError(t("import.error.invalidFormat") || "El archivo debe ser un Excel (.xlsx o .xls)");
      return;
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(t("import.error.fileTooLarge") || "El archivo es demasiado grande (máximo 10MB)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);
      setError(null);
      setResult(null);

      // Obtener token de autenticación
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error(t("import.error.notAuthenticated") || "No estás autenticado");
      }

      // Obtener URL de la Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error(t("import.error.configMissing") || "Configuración de Supabase no encontrada");
      }

      // Asegurar que la URL no termine con /
      const cleanUrl = supabaseUrl.replace(/\/$/, "");
      const functionUrl = `${cleanUrl}/functions/v1/import-products-from-excel`;

      // Crear FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("overwriteExisting", overwriteExisting.toString());

      // Simular progreso (ya que no hay forma real de obtenerlo desde la Edge Function)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 500);

      // Llamar a la Edge Function
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || t("import.error.uploadFailed") || "Error al subir el archivo");
      }

      if (data.success && data.result) {
        setResult(data.result);
      } else {
        throw new Error(data.error || t("import.error.uploadFailed") || "Error al procesar el archivo");
      }
    } catch (err: any) {
      console.error("[ImportProductsDialog] Error:", err);
      setError(err.message || t("import.error.unknown") || "Error desconocido");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!result) return;

    const errorsText = [
      "=== ERRORES DE VALIDACIÓN ===\n",
      ...result.validationErrors.map((e) => `Fila ${e.row}${e.code ? ` (${e.code})` : ""}: ${e.reason}`),
      "\n=== ERRORES DE IMPORTACIÓN ===\n",
      ...result.errors.map((e) => `${e.code}: ${e.reason}`)
    ].join("\n");

    const blob = new Blob([errorsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errores-importacion-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setResult(null);
      setError(null);
      setProgress(0);
      setOverwriteExisting(false); // Reset a solo nuevos
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onClose();
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="mb-2">{t("import.title") || "Importar Productos desde Excel"}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t("import.description") || "Sube un archivo Excel para importar productos. Puedes elegir si actualizar productos existentes o solo añadir nuevos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-1">
          {/* Selección de archivo */}
          {!result && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("import.selectFile") || "Seleccionar archivo Excel"}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-input"
                    className={cn(
                      "flex-1 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                      file
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400",
                      uploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t("import.clickToSelect") || "Haz clic para seleccionar un archivo"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t("import.supportedFormats") || "Formatos: .xlsx, .xls (máx. 10MB)"}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Opciones de importación */}
              {file && !uploading && (
                <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("import.options.title") || "Opciones de importación"}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={!overwriteExisting}
                        onChange={() => setOverwriteExisting(false)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("import.options.onlyNew") || "Solo añadir nuevos"}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t("import.options.onlyNewDesc") || "Mantiene el stock de productos existentes. Solo crea productos que no existen."}
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={overwriteExisting}
                        onChange={() => setOverwriteExisting(true)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("import.options.overwrite") || "Sobrescribir todos"}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t("import.options.overwriteDesc") || "Actualiza productos existentes y crea los nuevos. ⚠️ Esto puede modificar datos de productos existentes."}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Barra de progreso */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t("import.uploading") || "Subiendo y procesando..."}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={handleClose} disabled={uploading}>
                  {t("common.cancel") || "Cancelar"}
                </Button>
                <Button onClick={handleUpload} disabled={!file || uploading}>
                  {uploading
                    ? t("import.uploading") || "Subiendo..."
                    : t("import.upload") || "Subir e Importar"}
                </Button>
              </div>
            </div>
          )}

          {/* Resultados */}
          {result && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                      {t("import.success") || "¡Importación completada!"}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          {t("import.created") || "Creados"}:
                        </span>{" "}
                        <span className="text-green-900 dark:text-green-100">{result.created}</span>
                      </div>
                      {overwriteExisting ? (
                        <div>
                          <span className="text-green-700 dark:text-green-300 font-medium">
                            {t("import.updated") || "Actualizados"}:
                          </span>{" "}
                          <span className="text-green-900 dark:text-green-100">{result.updated}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-green-700 dark:text-green-300 font-medium">
                            {t("import.skipped") || "Omitidos"}:
                          </span>{" "}
                          <span className="text-green-900 dark:text-green-100">{result.skipped}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          {t("import.errors") || "Errores"}:
                        </span>{" "}
                        <span className="text-green-900 dark:text-green-100">
                          {result.errors.length + result.validationErrors.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          {t("import.duration") || "Tiempo"}:
                        </span>{" "}
                        <span className="text-green-900 dark:text-green-100">
                          {result.duration.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(result.errors.length > 0 || result.validationErrors.length > 0) && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                        {t("import.hasErrors") || "Se encontraron errores durante la importación"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadErrors}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {t("import.downloadErrors") || "Descargar log de errores"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button onClick={handleClose}>
                  {t("common.close") || "Cerrar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

