import * as React from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import type { AiChatService } from "../../application/services/AiChatService";

/**
 * Tipos de mensajes del chat
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    permissions?: string[];
    actionRequired?: boolean;
    menuOptions?: Array<{
      id: string;
      label: string;
      emoji?: string;
      action?: string;
      path?: string;
      query?: string;
      hasSubOptions?: boolean;
    }>;
    menuId?: string;
  };
}

/**
 * Contexto del chat de IA
 */
interface AiChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const AiChatContext = React.createContext<AiChatContextValue | undefined>(undefined);

/**
 * Provider del contexto de chat de IA
 */
export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const { authContext } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const aiServiceRef = React.useRef<AiChatService | null>(null);

  const toggleChat = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openChat = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearMessages = React.useCallback(() => {
    setMessages([]);
  }, []);

  // Inicializar el servicio de IA
  React.useEffect(() => {
    if (!aiServiceRef.current) {
      import("../../application/services/AiChatService").then(({ AiChatService }) => {
        aiServiceRef.current = new AiChatService();
      });
    }
  }, []);

  // Usar el servicio de IA
  const sendMessage = React.useCallback(async (content: string) => {
    // No mostrar mensaje del usuario si es un comando interno de menú o mensaje vacío
    const isInternalCommand = content.trim().startsWith("menu:") || 
                              content.trim().startsWith("how_to:") || 
                              content.trim().startsWith("query:") || 
                              content.trim().startsWith("info:") ||
                              content.trim() === "";

    // Solo añadir mensaje del usuario si NO es un comando interno y tiene contenido
    if (!isInternalCommand && content.trim()) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    // Si el contenido está vacío, procesarlo como comando para mostrar menú principal
    if (!content.trim()) {
      content = ""; // Mantener vacío para que el servicio lo procese como menú principal
    }

    setIsLoading(true);

    try {
      // Esperar a que el servicio esté disponible
      if (!aiServiceRef.current) {
        const { AiChatService } = await import("../../application/services/AiChatService");
        aiServiceRef.current = new AiChatService();
      }

      // Obtener permisos y rol del usuario actual
      const userPermissions = authContext?.permissions || [];
      const userRole = authContext?.profile.role;
      
      console.log("📤 [AiChatContext] Enviando mensaje:", content.trim());
      console.log("👤 [AiChatContext] Usuario:", { 
        permissions: userPermissions, 
        role: userRole,
        hasAuthContext: !!authContext
      });
      
      console.log("🔄 [AiChatContext] Llamando a processMessage...");
      const response = await aiServiceRef.current.processMessage(
        content.trim(),
        userPermissions,
        userRole
      );
      
      console.log("📥 [AiChatContext] Respuesta recibida:", response);
      
      if (!response || !response.content) {
        console.error("❌ [AiChatContext] Respuesta inválida:", response);
        throw new Error("Respuesta inválida del servicio de IA");
      }
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        metadata: {
          sources: response.sources,
          permissions: response.requiresPermission ? [response.requiresPermission] : undefined,
          menuOptions: response.menuOptions,
          menuId: response.menuId
        }
      };

      console.log("💬 [AiChatContext] Mensaje del asistente creado:", assistantMessage);
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log("📝 [AiChatContext] Mensajes actualizados, total:", newMessages.length);
        return newMessages;
      });
    } catch (error) {
      console.error("Error en chat de IA:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "system",
        content: t("ai.chat.error"),
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [authContext, t]);

  const value: AiChatContextValue = {
    isOpen,
    messages,
    isLoading,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearMessages
  };

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

/**
 * Hook para usar el contexto de chat de IA
 */
export function useAiChat() {
  const context = React.useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat debe usarse dentro de AiChatProvider");
  }
  return context;
}

