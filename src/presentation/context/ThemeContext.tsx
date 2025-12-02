import * as React from "react";
import { useAuth } from "./AuthContext";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

/**
 * Función auxiliar para convertir color HEX a RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Función auxiliar para generar variaciones de color (más claro/más oscuro)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.max(0, rgb.r + (rgb.r * percent) / 100));
  const g = Math.min(255, Math.max(0, rgb.g + (rgb.g * percent) / 100));
  const b = Math.min(255, Math.max(0, rgb.b + (rgb.b * percent) / 100));

  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

/**
 * Contexto para gestionar el tema de la aplicación (light/dark/system).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { authContext } = useAuth();
  const [theme, setThemeState] = React.useState<ThemeMode>(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    return stored ?? "system";
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

  // Aplicar tema (claro/oscuro)
  React.useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [effectiveTheme]);

  // Aplicar colores personalizados solo en modo claro
  React.useEffect(() => {
    const root = document.documentElement;
    
    if (effectiveTheme === "light" && authContext?.settings) {
      const { primaryColor, secondaryColor } = authContext.settings;
      
      // Aplicar color primario y sus variaciones
      if (primaryColor) {
        root.style.setProperty("--primary-500", primaryColor);
        root.style.setProperty("--primary-600", primaryColor);
        root.style.setProperty("--primary-700", adjustColorBrightness(primaryColor, -15));
        root.style.setProperty("--primary-100", adjustColorBrightness(primaryColor, 80));
        root.style.setProperty("--primary-50", adjustColorBrightness(primaryColor, 90));
      }
      
      // Aplicar color secundario y sus variaciones
      if (secondaryColor) {
        root.style.setProperty("--secondary-500", secondaryColor);
        root.style.setProperty("--secondary-600", adjustColorBrightness(secondaryColor, -10));
        root.style.setProperty("--secondary-50", adjustColorBrightness(secondaryColor, 85));
      }
    } else {
      // Restaurar colores por defecto en modo oscuro
      root.style.removeProperty("--primary-500");
      root.style.removeProperty("--primary-600");
      root.style.removeProperty("--primary-700");
      root.style.removeProperty("--primary-100");
      root.style.removeProperty("--primary-50");
      root.style.removeProperty("--secondary-500");
      root.style.removeProperty("--secondary-600");
      root.style.removeProperty("--secondary-50");
    }
  }, [effectiveTheme, authContext?.settings?.primaryColor, authContext?.settings?.secondaryColor]);

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
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

