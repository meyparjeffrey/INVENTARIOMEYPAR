import { ArrowLeft, User, Save } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Avatar } from "../components/ui/Avatar";

/**
 * Página de perfil de usuario con formulario editable.
 */
export function ProfilePage() {
  const { t } = useLanguage();
  const { authContext } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [firstName, setFirstName] = React.useState(authContext?.profile.firstName || "");
  const [lastName, setLastName] = React.useState(authContext?.profile.lastName || "");

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implementar actualización de perfil en Supabase
      // eslint-disable-next-line no-console
      console.log("Guardar perfil:", { firstName, lastName });
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error guardando perfil:", error);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{t("user.profile")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona tu información personal
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <Avatar
              name={`${firstName} ${lastName}`}
              initials={authContext.profile.initials}
              imageUrl={authContext.profile.avatarUrl}
              size="lg"
            />
            <div>
              <Button variant="outline" size="sm">
                Cambiar foto
              </Button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Máximo 500KB. Formatos: JPG, PNG
              </p>
            </div>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={authContext.profile.email || ""}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              El correo electrónico no se puede modificar
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

