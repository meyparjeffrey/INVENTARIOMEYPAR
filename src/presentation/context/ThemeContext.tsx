import * as React from "react";

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
 * Contexto para gestionar el tema de la aplicación (light/dark/system).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
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

