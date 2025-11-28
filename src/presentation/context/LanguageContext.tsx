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
    "login.success": "Credenciales correctas, redirigiendo...",
    "login.error": "Error al iniciar sesión",
    "login.error.invalidCredentials": "Credenciales inválidas. Por favor, verifica tu correo y contraseña.",
    "login.error.network": "Error de conexión. Verifica tu conexión a internet.",
    "login.error.emailRequired": "El correo electrónico es obligatorio",
    "login.error.emailInvalid": "Por favor, introduce un correo electrónico válido",
    "login.error.passwordRequired": "La contraseña es obligatoria",
    "login.error.passwordMinLength": "La contraseña debe tener al menos 6 caracteres",
    "login.feature.secure": "Seguro y confiable",
    "login.feature.fast": "Rápido y eficiente",
    "login.feature.control": "Control total del inventario",
    "login.version": "Versión",
    "app.name": "ALMACÉN MEYPAR",
    "app.subtitle": "Sistema de Inventario",
    "connection.connected": "Conectado",
    "connection.disconnected": "Desconectado",
    "connection.checking": "Comprobando...",
    "connection.title.connected": "Conectado a la base de datos",
    "connection.title.disconnected": "Desconectado de la base de datos",
    "connection.title.checking": "Comprobando conexión..."
  },
  "ca-ES": {
    "login.title": "Inventari",
    "login.subtitle": "Inicia sessió per continuar",
    "login.email": "Correu electrònic",
    "login.password": "Contrasenya",
    "login.remember": "Recordar sessió",
    "login.submit": "Iniciar sessió",
    "login.submitting": "Iniciant…",
    "login.success": "Credencials correctes, redirigint...",
    "login.error": "Error en iniciar sessió",
    "login.error.invalidCredentials": "Credencials invàlides. Si us plau, verifica el teu correu i contrasenya.",
    "login.error.network": "Error de connexió. Verifica la teva connexió a internet.",
    "login.error.emailRequired": "El correu electrònic és obligatori",
    "login.error.emailInvalid": "Si us plau, introdueix un correu electrònic vàlid",
    "login.error.passwordRequired": "La contrasenya és obligatòria",
    "login.error.passwordMinLength": "La contrasenya ha de tenir almenys 6 caràcters",
    "login.feature.secure": "Segur i fiable",
    "login.feature.fast": "Ràpid i eficient",
    "login.feature.control": "Control total de l'inventari",
    "login.version": "Versió",
    "app.name": "MAGATZEM MEYPAR",
    "app.subtitle": "Sistema d'Inventari",
    "connection.connected": "Conectat",
    "connection.disconnected": "Desconnectat",
    "connection.checking": "Comprovant...",
    "connection.title.connected": "Conectat a la base de dades",
    "connection.title.disconnected": "Desconnectat de la base de dades",
    "connection.title.checking": "Comprovant connexió..."
  }
};

/**
 * Contexto para gestionar el idioma de la aplicación (es-ES/ca-ES).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(() => {
    const stored = localStorage.getItem("language") as LanguageCode | null;
    return stored ?? "ca-ES"; // Idioma por defecto: CATALÁN
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

