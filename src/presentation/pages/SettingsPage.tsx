import { ArrowLeft, Settings, Save } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { ThemeToggle } from "../components/ui/ThemeToggle";

/**
 * Página de configuración de usuario.
 */
export function SettingsPage() {
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implementar guardado de configuración en Supabase
      // eslint-disable-next-line no-console
      console.log("Guardar configuración");
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error guardando configuración:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!authContext) {
    return null;
  }

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
            Personaliza tu experiencia
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="space-y-6">
        {/* Preferencias de idioma y tema */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Apariencia
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Idioma</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona el idioma de la interfaz
                </p>
              </div>
              <LanguageSelector />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Tema</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Elige entre tema claro u oscuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Otras configuraciones */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            Preferencias
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="itemsPerPage">Elementos por página</Label>
              <Input
                id="itemsPerPage"
                type="number"
                min="10"
                max="100"
                defaultValue={authContext.settings?.itemsPerPage || 25}
              />
            </div>
            {/* Más configuraciones según PROYECTO_FINAL.md */}
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
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
    </div>
  );
}

