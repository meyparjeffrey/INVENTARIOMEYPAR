import * as React from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import type { IAiService } from "../../application/services/interfaces/IAiService";

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
 * Tipo de motor de IA disponible
 */
export type AiEngineType = "local" | "gemini";

/**
 * Contexto del chat de IA
 */
interface AiChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  aiEngine: AiEngineType;
  setAiEngine: (engine: AiEngineType) => void;
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
  const [aiEngine, setAiEngineState] = React.useState<AiEngineType>(() => {
    // Leer preferencia del localStorage
    const stored = localStorage.getItem("aiEngine");
    return (stored === "gemini" || stored === "local") ? stored : "local";
  });
  const aiServiceRef = React.useRef<IAiService | null>(null);

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

  // Función para cambiar el motor de IA
  const setAiEngine = React.useCallback((engine: AiEngineType) => {
    setAiEngineState(engine);
    localStorage.setItem("aiEngine", engine);
    // Reinicializar el servicio cuando cambia el motor
    aiServiceRef.current = null;
  }, []);

  // Inicializar el servicio de IA según el motor seleccionado
  React.useEffect(() => {
    const initService = async () => {
      if (aiServiceRef.current) {
        // Si ya existe y es del mismo tipo, no reinicializar
        return;
      }

      try {
        if (aiEngine === "gemini") {
          const { GeminiAiService } = await import("../../application/services/GeminiAiService");
          const geminiService = new GeminiAiService();
          // Si Gemini no está disponible, usar local
          if (!geminiService.isAvailable()) {
            console.warn("[AiChat] Gemini no disponible, usando servicio local");
            const { AiChatService } = await import("../../application/services/AiChatService");
            aiServiceRef.current = new AiChatService();
            setAiEngineState("local");
            localStorage.setItem("aiEngine", "local");
          } else {
            aiServiceRef.current = geminiService;
          }
        } else {
          const { AiChatService } = await import("../../application/services/AiChatService");
          aiServiceRef.current = new AiChatService();
        }
      } catch (error) {
        console.error("[AiChat] Error inicializando servicio de IA:", error);
        // Fallback a servicio local
        const { AiChatService } = await import("../../application/services/AiChatService");
        aiServiceRef.current = new AiChatService();
        setAiEngineState("local");
      }
    };

    initService();
  }, [aiEngine]);

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
        if (aiEngine === "gemini") {
          const { GeminiAiService } = await import("../../application/services/GeminiAiService");
          const geminiService = new GeminiAiService();
          aiServiceRef.current = geminiService.isAvailable() ? geminiService : null;
        }
        
        if (!aiServiceRef.current) {
          const { AiChatService } = await import("../../application/services/AiChatService");
          aiServiceRef.current = new AiChatService();
        }
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
    aiEngine,
    setAiEngine,
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

