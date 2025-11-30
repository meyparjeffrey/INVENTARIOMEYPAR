import * as React from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  effectiveTheme: "light" | "dark";
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

/**
 * Contexto para gestionar el tema de la aplicación (light/dark/system).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    return stored ?? "system";
  });

  const [primaryColor, setPrimaryColorState] = React.useState<string>(() => {
    const stored = localStorage.getItem("primaryColor");
    return stored ?? "#e62144"; // Color corporativo por defecto
  });

  const [secondaryColor, setSecondaryColorState] = React.useState<string>(() => {
    const stored = localStorage.getItem("secondaryColor");
    return stored ?? "#059669"; // Verde esmeralda por defecto
  });

  const [effectiveTheme, setEffectiveTheme] = React.useState<"light" | "dark">(
    () => {
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return theme;
    }
  );

  // Aplicar tema y colores al DOM
  React.useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Aplicar colores personalizados como variables CSS
    root.style.setProperty("--color-primary", primaryColor);
    root.style.setProperty("--color-secondary", secondaryColor);
  }, [effectiveTheme, primaryColor, secondaryColor]);

  React.useEffect(() => {
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      setEffectiveTheme(mediaQuery.matches ? "dark" : "light");
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme]);

  const setTheme = React.useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  const setPrimaryColor = React.useCallback((color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem("primaryColor", color);
    document.documentElement.style.setProperty("--color-primary", color);
  }, []);

  const setSecondaryColor = React.useCallback((color: string) => {
    setSecondaryColorState(color);
    localStorage.setItem("secondaryColor", color);
    document.documentElement.style.setProperty("--color-secondary", color);
  }, []);

  // Cargar colores desde user_settings si están disponibles
  React.useEffect(() => {
    const loadColorsFromSettings = async () => {
      try {
        const { useAuth } = await import("../context/AuthContext");
        // Esto se hará desde SettingsPage cuando se cargue
      } catch (error) {
        // Ignorar errores
      }
    };
    loadColorsFromSettings();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        effectiveTheme,
        primaryColor,
        secondaryColor,
        setPrimaryColor,
        setSecondaryColor
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de tema.
 */
export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}

