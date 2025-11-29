import * as React from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AiChatProvider } from "./context/AiChatContext";
import { router } from "./routes";
import "./styles.css";

/**
 * Componente raíz de la aplicación.
 * Proporciona contextos globales y configura el router.
 */
export function App() {
  // Forzar hash inicial a /login en Electron antes de que se monte el router
  React.useEffect(() => {
    const isElectron = window.location.protocol === "file:";
    if (isElectron) {
      const hash = window.location.hash;
      // Si no hay hash o es solo # o #/, forzar a /login
      if (!hash || hash === "#" || hash === "#/") {
        window.location.hash = "#/login";
      }
    } else {
      // En desarrollo web, forzar pathname a /login si está en /
      if (window.location.pathname === "/") {
        window.history.replaceState(null, "", "/login");
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AiChatProvider>
            <RouterProvider router={router} />
          </AiChatProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
