import { useLanguage } from "../context/LanguageContext";

/**
 * Hook personalizado que garantiza que siempre se usen traducciones.
 * 
 * REGLA CRÍTICA: TODO texto visible al usuario DEBE estar traducido a ambos idiomas (español y catalán).
 * El idioma por defecto es CATALÁN (ca-ES).
 * 
 * Uso:
 * ```tsx
 * const { t } = useTranslation();
 * <h1>{t("profile.title")}</h1>
 * ```
 * 
 * IMPORTANTE: Si agregas un nuevo texto visible al usuario:
 * 1. Agrega la traducción en LanguageContext.tsx en AMBOS idiomas (es-ES y ca-ES)
 * 2. Usa este hook para acceder a las traducciones
 * 3. NUNCA hardcodees textos en español directamente en los componentes
 */
export function useTranslation() {
  const { t, language } = useLanguage();

  /**
   * Función de traducción mejorada con validación.
   * Si la clave no existe, muestra un warning en desarrollo.
   */
  const translate = (key: string): string => {
    const translation = t(key);
    
    // En desarrollo, advertir si la traducción no existe
    if (process.env.NODE_ENV === "development" && translation === key) {
      console.warn(
        `[useTranslation] Traducción faltante para la clave: "${key}" (idioma: ${language})`
      );
    }
    
    return translation;
  };

  return {
    t: translate,
    language
  };
}

