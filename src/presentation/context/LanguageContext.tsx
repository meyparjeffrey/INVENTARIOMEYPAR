import * as React from "react";

type LanguageCode = "es-ES" | "ca-ES";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(
  undefined
);

// Traducciones básicas para el login
const translations: Record<LanguageCode, Record<string, string>> = {
  "es-ES": {
    "login.title": "Inventario",
    "login.subtitle": "Inicia sesión para continuar",
    "login.email": "Correo electrónico",
    "login.password": "Contraseña",
    "login.remember": "Recordar sesión",
    "login.submit": "Iniciar sesión",
    "login.submitting": "Iniciando…",
    "login.error": "Error al iniciar sesión"
  },
  "ca-ES": {
    "login.title": "Inventari",
    "login.subtitle": "Inicia sessió per continuar",
    "login.email": "Correu electrònic",
    "login.password": "Contrasenya",
    "login.remember": "Recordar sessió",
    "login.submit": "Iniciar sessió",
    "login.submitting": "Iniciant…",
    "login.error": "Error en iniciar sessió"
  }
};

/**
 * Contexto para gestionar el idioma de la aplicación (es-ES/ca-ES).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(() => {
    const stored = localStorage.getItem("language") as LanguageCode | null;
    return stored ?? "es-ES";
  });

  const t = React.useCallback(
    (key: string): string => {
      return translations[language]?.[key] ?? key;
    },
    [language]
  );

  const setLanguage = React.useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de idioma.
 */
export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  }
  return context;
}

