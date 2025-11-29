import { Moon, Sun } from "lucide-react";
import * as React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";

/**
 * Toggle para cambiar entre tema claro/oscuro/sistema.
 */
export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const toggleTheme = () => {
    // Solo alternar entre light y dark (un clic)
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
      title={`${theme === "system" ? "Sistema" : theme === "light" ? "Tema claro" : "Tema oscuro"}`}
    >
      {effectiveTheme === "dark" ? (
        <Moon className="h-4 w-4 transition-transform hover:rotate-12" />
      ) : (
        <Sun className="h-4 w-4 transition-transform hover:rotate-12" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

