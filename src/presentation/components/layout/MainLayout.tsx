import * as React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AiChatButton } from "../ai/AiChatButton";
import { AiChatPanel } from "../ai/AiChatPanel";

/**
 * Layout principal que combina Sidebar, Header y área de contenido.
 * 
 * Estructura:
 * - Contenedor principal con altura de pantalla completa
 * - Sidebar fijo a la izquierda
 * - Área de contenido con Header fijo y main scrolleable
 * - Solo UN scroll (el del main)
 */
export function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
      {/* Botón flotante y panel de chat de IA */}
      <AiChatButton />
      <AiChatPanel />
    </div>
  );
}

