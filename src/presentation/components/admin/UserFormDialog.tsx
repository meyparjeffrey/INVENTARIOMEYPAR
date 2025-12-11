/**
 * Diálogo de formulario para crear o editar usuarios.
 * 
 * Permite crear nuevos usuarios o editar usuarios existentes con:
 * - Email y contraseña (solo para crear)
 * - Nombre y apellido
 * - Rol (ADMIN, WAREHOUSE, VIEWER)
 * - Estado activo/inactivo
 * 
 * La creación de usuarios se realiza mediante una Edge Function de Supabase
 * que tiene acceso a service_role_key para crear usuarios en auth.users.
 * 
 * @module @presentation/components/admin/UserFormDialog
 */

import * as React from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { useLanguage } from "../../context/LanguageContext";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import type { UserRow } from "../../pages/AdminPage";

/**
 * Props del componente UserFormDialog.
 * 
 * @interface UserFormDialogProps
 * @property {boolean} isOpen - Indica si el diálogo está abierto
 * @property {() => void} onClose - Callback al cerrar el diálogo
 * @property {() => void} onSuccess - Callback al completar la operación exitosamente
 * @property {UserRow | null} [user] - Usuario a editar (undefined para crear nuevo)
 */
interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: UserRow | null;
}

/**
 * Componente de diálogo para crear o editar usuarios.
 * 
 * Características:
 * - Validación de formulario en tiempo real
 * - Creación de usuarios mediante Edge Function
 * - Edición de usuarios existentes
 * - Soporte multiidioma (ES/CA)
 * - Manejo de errores con mensajes descriptivos
 * 
 * @param {UserFormDialogProps} props - Props del componente
 * @returns {JSX.Element} Diálogo de formulario de usuario
 */
export function UserFormDialog({ isOpen, onClose, onSuccess, user }: UserFormDialogProps) {
  const { t } = useLanguage();
  const isEditing = !!user;
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState({
    email: user?.email || "",
    password: "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    role: user?.role || "WAREHOUSE",
    isActive: user?.isActive ?? true
  });

  const [showPassword, setShowPassword] = React.useState(false);

  // Resetear formulario cuando cambia el usuario o se abre/cierra
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        email: user?.email || "",
        password: "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        role: user?.role || "WAREHOUSE",
        isActive: user?.isActive ?? true
      });
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen, user]);

  /**
   * Genera una contraseña aleatoria segura.
   * 
   * Características:
   * - 12 caracteres de longitud
   * - Incluye mayúsculas, minúsculas, números y símbolos
   * - Cumple con requisitos de seguridad estándar
   * 
   * @returns {string} Contraseña generada
   */
  const generatePassword = (): string => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = "";
    // Asegurar al menos un carácter de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar hasta 12 caracteres
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar los caracteres
    return password.split("").sort(() => Math.random() - 0.5).join("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validación
    const newErrors: Record<string, string> = {};

    if (!isEditing && !formData.email.trim()) {
      newErrors.email = t("admin.users.error.emailRequired") || "El correo es obligatorio";
    } else if (!isEditing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = t("admin.users.error.emailInvalid") || "Formato de correo inválido";
    }

    if (!isEditing && !formData.password) {
      newErrors.password = t("admin.users.error.passwordRequired") || "La contraseña es obligatoria";
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = t("admin.users.error.passwordMinLength") || "La contraseña debe tener al menos 6 caracteres";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = t("admin.users.error.firstNameRequired") || "El nombre es obligatorio";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t("admin.users.error.lastNameRequired") || "El apellido es obligatorio";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Actualizar usuario existente
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            role: formData.role,
            is_active: formData.isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", user!.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo usuario mediante Edge Function
        let data: { success?: boolean; error?: string; userId?: string } | null = null;
        let createError: { message?: string } | null = null;
        
        try {
          const response = await supabaseClient.functions.invoke("create-user", {
            body: {
              email: formData.email.trim(),
              password: formData.password,
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              role: formData.role,
              isActive: formData.isActive
            },
            method: "POST"
          });
          
          data = response.data;
          createError = response.error;
          
          // Si hay error, intentar parsear el mensaje
          if (createError) {
            console.error("[UserFormDialog] Error response:", createError);
            let errorMessage = createError.message || t("admin.users.error.saveFailed") || "Error al guardar el usuario";
            
            // Si hay data con error, usar ese mensaje
            if (data && typeof data === 'object' && 'error' in data) {
              errorMessage = (data as { error: string }).error;
            }
            
            // Normalizar mensajes de error comunes
            if (errorMessage.includes("already registered") || 
                errorMessage.includes("already exists") || 
                errorMessage.includes("duplicate") ||
                errorMessage.includes("ya existe")) {
              errorMessage = t("admin.users.error.emailExists") || "Este correo ya está registrado";
            }
            
            setErrors({ email: errorMessage });
            setLoading(false);
            return;
          }

          // Verificar si la respuesta tiene error aunque no haya createError
          if (data && typeof data === 'object') {
            if ('error' in data && data.error) {
              let errorMessage = (data as { error: string }).error;
              if (errorMessage.includes("already registered") || 
                  errorMessage.includes("already exists") || 
                  errorMessage.includes("duplicate") ||
                  errorMessage.includes("ya existe")) {
                errorMessage = t("admin.users.error.emailExists") || "Este correo ya está registrado";
              }
              setErrors({ email: errorMessage });
              setLoading(false);
              return;
            }
            
            // Verificar si success es false
            if ('success' in data && data.success === false && 'error' in data) {
              let errorMessage = (data as { error: string }).error;
              if (errorMessage.includes("already registered") || 
                  errorMessage.includes("already exists") || 
                  errorMessage.includes("duplicate") ||
                  errorMessage.includes("ya existe")) {
                errorMessage = t("admin.users.error.emailExists") || "Este correo ya está registrado";
              }
              setErrors({ email: errorMessage });
              setLoading(false);
              return;
            }
            
            // Verificar que success sea true
            if ('success' in data && data.success !== true) {
              // Si success no es true y no hay error, mostrar mensaje genérico
              const errorMessage = (data as { error?: string }).error || t("admin.users.error.saveFailed") || "Error al guardar el usuario";
              setErrors({ email: errorMessage });
              setLoading(false);
              return;
            }
          }
        } catch (invokeError: unknown) {
          console.error("[UserFormDialog] Error calling Edge Function:", invokeError);
          const errorMessage = invokeError instanceof Error ? invokeError.message : t("admin.users.error.saveFailed") || "Error al guardar el usuario";
          setErrors({ email: errorMessage });
          setLoading(false);
          return;
        }
      }

      // Verificar que la operación fue exitosa (solo para creación)
      if (!isEditing) {
        // Si hay data, verificar success
        if (data && typeof data === 'object' && 'success' in data) {
          if (data.success === false) {
            // Ya se manejó el error arriba
            return;
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error("[UserFormDialog] Error:", error);
      let errorMessage = error instanceof Error ? error.message : t("admin.users.error.saveFailed") || "Error al guardar el usuario";
      
      // Si el error menciona email duplicado
      if (errorMessage.includes("already registered") || 
          errorMessage.includes("already exists") || 
          errorMessage.includes("duplicate") ||
          errorMessage.includes("ya existe")) {
        errorMessage = t("admin.users.error.emailExists") || "Este correo ya está registrado";
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <DialogContent size="md" className="p-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle>
              {isEditing ? t("admin.users.edit") || "Editar Usuario" : t("admin.users.new") || "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica la información del usuario"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-grow">
              {!isEditing && (
                <div>
                  <Label htmlFor="email">
                    {t("admin.users.email") || "Correo"} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                    disabled={loading}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                </div>
              )}

              {!isEditing && (
                <div>
                  <Label htmlFor="password">
                    {t("admin.users.password") || "Contrasenya"} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      disabled={loading}
                      className={errors.password ? "border-red-500 pr-20" : "pr-20"}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={showPassword ? t("admin.users.hidePassword") || "Ocultar contraseña" : t("admin.users.showPassword") || "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPassword = generatePassword();
                          setFormData({ ...formData, password: newPassword });
                          setShowPassword(true);
                        }}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={t("admin.users.generatePassword") || "Generar contraseña segura"}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="firstName">
                  {t("admin.users.firstName") || "Nom"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Juan"
                  disabled={loading}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>}
              </div>

              <div>
                <Label htmlFor="lastName">
                  {t("admin.users.lastName") || "Cognom"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Pérez"
                  disabled={loading}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>}
              </div>

              <div>
                <Label htmlFor="role">{t("admin.users.role") || "Rol"}</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "WAREHOUSE" | "VIEWER" })}
                  disabled={loading}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all duration-200 hover:border-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="VIEWER">{t("admin.users.roleViewer") || "VIEWER - Solo lectura"}</option>
                  <option value="WAREHOUSE">{t("admin.users.roleWarehouse") || "WAREHOUSE - Almacén"}</option>
                  <option value="ADMIN">{t("admin.users.roleAdmin") || "ADMIN - Administrador"}</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Label htmlFor="isActive" className="!mb-0 cursor-pointer">
                  {t("admin.users.active") || "Activo"}
                </Label>
              </div>

              {errors.submit && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {errors.submit}
                </div>
              )}
            </div>
            <DialogFooter className="flex-shrink-0 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                {t("common.cancel") || "Cancelar"}
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? t("common.saving") || "Guardando..." : isEditing ? t("common.saveChanges") || "Guardar cambios" : t("admin.users.create") || "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </DialogRoot>
  );
}

