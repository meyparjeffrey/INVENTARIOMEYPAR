import * as React from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import type { AiChatService } from '../../application/services/AiChatService';

/**
 * Tipos de mensajes del chat
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
  isInitializing: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const AiChatContext = React.createContext<AiChatContextValue | undefined>(
  undefined,
);

/**
 * Provider del contexto de chat de IA
 */
export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const { authContext } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const aiServiceRef = React.useRef<AiChatService | null>(null);

  // Límite de mensajes en el historial para evitar problemas de memoria
  const MAX_MESSAGES_HISTORY = 100;

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

  // Inicializar el servicio de IA (solo una vez)
  React.useEffect(() => {
    if (!aiServiceRef.current) {
      setIsInitializing(true);
      import('../../application/services/AiChatService')
        .then(({ AiChatService }) => {
          aiServiceRef.current = new AiChatService(undefined, undefined, language);
          setIsInitializing(false);
        })
        .catch((error) => {
          console.error('Error cargando servicio de IA:', error);
          setIsInitializing(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias - solo inicializar una vez (language se actualiza en otro useEffect)

  // Actualizar el idioma del servicio cuando cambie
  React.useEffect(() => {
    if (aiServiceRef.current) {
      aiServiceRef.current.setLanguage(language);
    }
  }, [language]);

  /**
   * Detecta si un mensaje es un comando interno
   */
  const isInternalCommand = React.useCallback((content: string): boolean => {
    const trimmed = content.trim();
    return (
      trimmed.startsWith('menu:') ||
      trimmed.startsWith('how_to:') ||
      trimmed.startsWith('query:') ||
      trimmed.startsWith('info:') ||
      trimmed === ''
    );
  }, []);

  // Usar el servicio de IA
  const sendMessage = React.useCallback(
    async (content: string) => {
      // Validar que el servicio esté inicializado
      if (isInitializing) {
        console.warn('Servicio de IA aún no está inicializado');
        return;
      }

      // No mostrar mensaje del usuario si es un comando interno de menú o mensaje vacío
      const isInternal = isInternalCommand(content);

      // Solo añadir mensaje del usuario si NO es un comando interno y tiene contenido
      if (!isInternal && content.trim()) {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: content.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const newMessages = [...prev, userMessage];
          // Limitar el historial de mensajes
          if (newMessages.length > MAX_MESSAGES_HISTORY) {
            return newMessages.slice(-MAX_MESSAGES_HISTORY);
          }
          return newMessages;
        });
      }

      setIsLoading(true);

      try {
        // Esperar a que el servicio esté disponible
        if (!aiServiceRef.current) {
          setIsInitializing(true);
          try {
            const { AiChatService } =
              await import('../../application/services/AiChatService');
            aiServiceRef.current = new AiChatService(undefined, undefined, language);
            setIsInitializing(false);
          } catch (importError) {
            console.error('Error importando servicio de IA:', importError);
            setIsInitializing(false);
            // No lanzar error aquí, solo mostrar mensaje de error en el chat
            const errorMessage: ChatMessage = {
              id: `error-init-${Date.now()}`,
              role: 'system',
              content: t('ai.chat.error.init'),
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return;
          }
        } else {
          // Actualizar el idioma del servicio si ha cambiado
          aiServiceRef.current.setLanguage(language);
        }

        // Obtener permisos y rol del usuario actual con validación
        const userPermissions = authContext?.permissions || [];
        const userRole = authContext?.profile?.role;

        console.log('📤 [AiChatContext] Enviando mensaje:', content.trim());
        console.log('👤 [AiChatContext] Usuario:', {
          permissions: userPermissions,
          role: userRole,
          hasAuthContext: !!authContext,
        });

        console.log('🔄 [AiChatContext] Llamando a processMessage...');
        const response = await aiServiceRef.current.processMessage(
          content.trim(),
          userPermissions,
          userRole,
        );

        console.log('📥 [AiChatContext] Respuesta recibida:', response);

        if (!response) {
          console.error('❌ [AiChatContext] Respuesta nula o indefinida');
          throw new Error('El servicio de IA no retornó una respuesta');
        }

        // Si no hay contenido pero hay menuOptions, crear contenido básico
        if (
          !response.content &&
          response.menuOptions &&
          response.menuOptions.length > 0
        ) {
          response.content = t('ai.chat.menu.mainQuestion');
        }

        if (!response.content) {
          console.error('❌ [AiChatContext] Respuesta sin contenido:', response);
          throw new Error('Respuesta inválida del servicio de IA: sin contenido');
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          metadata: {
            source: response.sources?.[0], // Usar solo el primer source si existe
            permissions: response.requiresPermission
              ? [response.requiresPermission]
              : undefined,
            menuOptions: response.menuOptions,
            menuId: response.menuId,
          },
        };

        console.log('💬 [AiChatContext] Mensaje del asistente creado:', assistantMessage);
        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          console.log(
            '📝 [AiChatContext] Mensajes actualizados, total:',
            newMessages.length,
          );
          // Limitar el historial de mensajes
          if (newMessages.length > MAX_MESSAGES_HISTORY) {
            return newMessages.slice(-MAX_MESSAGES_HISTORY);
          }
          return newMessages;
        });
      } catch (error) {
        console.error('❌ [AiChatContext] Error en chat de IA:', error);
        console.error('❌ [AiChatContext] Contenido del mensaje:', content);
        console.error(
          '❌ [AiChatContext] Stack trace:',
          error instanceof Error ? error.stack : 'N/A',
        );

        // Solo mostrar error si NO es el mensaje inicial (vacío)
        // El mensaje inicial no debería mostrar errores, solo el menú
        if (content.trim() !== '') {
          // Determinar el tipo de error para mostrar un mensaje más específico
          let errorContent = t('ai.chat.error');
          if (error instanceof Error) {
            if (error.message.includes('cargar') || error.message.includes('import')) {
              errorContent = t('ai.chat.error.init');
            } else if (
              error.message.includes('red') ||
              error.message.includes('network')
            ) {
              errorContent = t('ai.chat.error.network');
            } else if (
              error.message.includes('permiso') ||
              error.message.includes('permission')
            ) {
              errorContent = t('ai.chat.error.permission');
            } else {
              errorContent = error.message || t('ai.chat.error');
            }
          }

          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'system',
            content: errorContent,
            timestamp: new Date(),
          };
          setMessages((prev) => {
            const newMessages = [...prev, errorMessage];
            // Limitar el historial de mensajes
            if (newMessages.length > MAX_MESSAGES_HISTORY) {
              return newMessages.slice(-MAX_MESSAGES_HISTORY);
            }
            return newMessages;
          });
        } else {
          // Si es el mensaje inicial y hay error, mostrar mensaje de bienvenida genérico
          const welcomeMessage: ChatMessage = {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: t('ai.chat.welcome.message'),
            timestamp: new Date(),
            metadata: {
              menuOptions: [],
            },
          };
          setMessages((prev) => {
            const newMessages = [...prev, welcomeMessage];
            if (newMessages.length > MAX_MESSAGES_HISTORY) {
              return newMessages.slice(-MAX_MESSAGES_HISTORY);
            }
            return newMessages;
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [authContext, t, isInitializing, isInternalCommand, language],
  );

  const value: AiChatContextValue = {
    isOpen,
    messages,
    isLoading,
    isInitializing,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
  };

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

/**
 * Hook para usar el contexto de chat de IA
 */
export function useAiChat() {
  const context = React.useContext(AiChatContext);
  if (!context) {
    // En lugar de lanzar error, retornar valores por defecto
    console.warn(
      'useAiChat: AiChatProvider no está disponible. Retornando valores por defecto.',
    );
    return {
      isOpen: false,
      messages: [],
      isLoading: false,
      isInitializing: false,
      toggleChat: () => {},
      openChat: () => {},
      closeChat: () => {},
      sendMessage: async () => {},
      clearMessages: () => {},
    };
  }
  return context;
}
