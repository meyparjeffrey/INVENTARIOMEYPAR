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
  const { t, language } = useLanguage();
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
    if (!content.trim()) return;

    console.log("[AiChat] Enviando mensaje:", content);
    
    // Añadir mensaje del usuario
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    console.log("[AiChat] Mensaje del usuario creado:", userMessage);
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      console.log("[AiChat] Mensajes actualizados (después de usuario):", newMessages.length, newMessages);
      return newMessages;
    });
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
      
      const response = await aiServiceRef.current.processMessage(
        content.trim(),
        userPermissions,
        userRole,
        language
      );
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        metadata: {
          sources: response.sources,
          permissions: response.requiresPermission ? [response.requiresPermission] : undefined
        }
      };

      console.log("[AiChat] Respuesta del asistente:", assistantMessage);
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log("[AiChat] Mensajes actualizados (después de asistente):", newMessages.length, newMessages);
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
  }, [authContext, t, language]);

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

