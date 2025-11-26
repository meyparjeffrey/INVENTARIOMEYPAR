import { Moon, Sun } from "lucide-react";
import * as React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";

/**
 * Toggle para cambiar entre tema claro/oscuro/sistema.
 */
export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="h-9 w-9 p-0"
      title={`Tema: ${theme === "system" ? "Sistema" : theme === "light" ? "Claro" : "Oscuro"}`}
    >
      {effectiveTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

