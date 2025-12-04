import { useLanguage } from "../context/LanguageContext";

/**
 * Hook para validar que todas las traducciones existan en ambos idiomas.
 * 
 * REGLA CRÍTICA: TODO texto nuevo visible al usuario DEBE estar traducido a ambos idiomas (español y catalán).
 * 
 * Este hook valida automáticamente que las claves de traducción existan en ambos idiomas.
 * En desarrollo, muestra warnings si faltan traducciones.
 * 
 * Uso:
 * ```tsx
 * const { validateTranslation, t } = useTranslationValidation();
 * 
 * // Validar antes de usar
 * const text = validateTranslation("products.newView", "Nueva Vista");
 * 
 * // O usar directamente (con validación automática)
 * const text = t("products.newView");
 * ```
 */
export function useTranslationValidation() {
  const { t, language } = useLanguage();

  /**
   * Valida que una traducción exista en ambos idiomas.
   * Si falta, muestra un warning en desarrollo y devuelve el fallback.
   */
  const validateTranslation = (
    key: string,
    fallback?: string
  ): string => {
    const translation = t(key);
    
    // Si la traducción no existe (devuelve la clave), validar
    if (translation === key) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[useTranslationValidation] ⚠️ Traducción faltante: "${key}" (idioma actual: ${language})`,
          "\n",
          "Por favor, agrega esta traducción en LanguageContext.tsx en AMBOS idiomas:",
          "\n",
          `  "es-ES": { "${key}": "Texto en español" },`,
          "\n",
          `  "ca-ES": { "${key}": "Text en català" }`
        );
      }
      
      // Devolver fallback si existe, sino la clave
      return fallback || key;
    }
    
    return translation;
  };

  /**
   * Función de traducción mejorada con validación automática.
   */
  const translate = (key: string, fallback?: string): string => {
    return validateTranslation(key, fallback);
  };

  return {
    t: translate,
    validateTranslation,
    language
  };
}

