import { Send, X, Sparkles, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import * as React from 'react';
import { useAiChat } from '../../context/AiChatContext';
import { useLanguage } from '../../context/LanguageContext';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '../../lib/cn';
import chatLogo from '../../../assets/logochat.svg';

/**
 * Componente para el logo del chat con fallback
 */
function ChatLogo() {
  const [logoError, setLogoError] = React.useState(false);

  if (logoError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-white font-bold text-xs">
        IA
      </div>
    );
  }

  return (
    <img
      src={chatLogo}
      alt="MEYPAR IA Logo"
      className="h-full w-full object-contain p-1.5"
      onError={() => setLogoError(true)}
    />
  );
}

/**
 * Panel de chat de IA que se desliza desde abajo
 */
export function AiChatPanel() {
  const { t } = useLanguage();
  const {
    isOpen,
    closeChat,
    messages,
    sendMessage,
    isLoading,
    clearMessages,
    isInitializing,
  } = useAiChat();
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const hasShownWelcome = React.useRef(false);
  const sendMessageRef = React.useRef(sendMessage);
  const messageRefs = React.useRef<Map<string, React.RefObject<HTMLDivElement>>>(
    new Map(),
  );
  const scrollPositionRef = React.useRef<number>(0);
  const previousMessagesLengthRef = React.useRef<number>(0);

  // Mantener referencia actualizada de sendMessage
  React.useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Crear refs para cada mensaje del asistente
  React.useEffect(() => {
    messages.forEach((message) => {
      if (message.role === 'assistant' && !messageRefs.current.has(message.id)) {
        messageRefs.current.set(message.id, React.createRef<HTMLDivElement>());
      }
    });
  }, [messages]);

  // Guardar posición de scroll cuando se cierra el chat
  React.useEffect(() => {
    if (!isOpen && messagesContainerRef.current) {
      scrollPositionRef.current = messagesContainerRef.current.scrollTop;
    }
  }, [isOpen]);

  // Restaurar posición de scroll cuando se abre el chat
  React.useEffect(() => {
    if (isOpen && messagesContainerRef.current && scrollPositionRef.current > 0) {
      // Pequeño delay para asegurar que el DOM se haya renderizado
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 150);
    }
  }, [isOpen]);

  // Auto-scroll mejorado: hacer scroll al INICIO del nuevo mensaje del asistente
  React.useEffect(() => {
    if (!messagesContainerRef.current || !isOpen) return;

    const lastMessage = messages[messages.length - 1];
    const hasNewMessage = messages.length > previousMessagesLengthRef.current;

    // Si hay un nuevo mensaje del asistente, hacer scroll al INICIO de ese mensaje
    if (hasNewMessage && lastMessage?.role === 'assistant') {
      const messageRef = messageRefs.current.get(lastMessage.id);

      // Función para hacer scroll al inicio del mensaje
      const scrollToMessageStart = () => {
        if (messageRef?.current && messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const messageElement = messageRef.current;

          // Calcular la posición del elemento dentro del contenedor
          const containerRect = container.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();

          // Calcular el scroll necesario para posicionar el INICIO del mensaje en la parte superior
          // con un margen de 20px
          const scrollTop =
            container.scrollTop + (messageRect.top - containerRect.top) - 20; // 20px de margen superior

          // Hacer scroll directamente a la posición calculada
          container.scrollTo({
            top: Math.max(0, scrollTop), // Asegurar que no sea negativo
            behavior: 'smooth',
          });
        }
      };

      // Intentar hacer scroll después de un delay para asegurar que el DOM se haya renderizado
      // Usar múltiples intentos para asegurar que funcione
      let attempts = 0;
      const maxAttempts = 10;

      const tryScroll = () => {
        attempts++;
        if (messageRef?.current && messagesContainerRef.current) {
          scrollToMessageStart();
        } else if (attempts < maxAttempts) {
          // Si el ref aún no está disponible, intentar de nuevo
          setTimeout(tryScroll, 100);
        }
      };

      // Primer intento después de un delay inicial
      setTimeout(tryScroll, 200);
    } else if (isLoading) {
      // Si está cargando, hacer scroll al final para ver el indicador de escritura
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages, isLoading, isOpen]);

  // Auto-focus en el input cuando se abre el panel
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Mostrar menú principal cuando se abre el chat por primera vez
  // Usar ref para evitar dependencia circular
  React.useEffect(() => {
    if (isOpen && messages.length === 0 && !hasShownWelcome.current && !isInitializing) {
      hasShownWelcome.current = true;
      // Pequeño delay para asegurar que el servicio esté completamente inicializado
      setTimeout(() => {
        if (sendMessageRef.current) {
          sendMessageRef.current('');
        }
      }, 300);
    }
    if (!isOpen) {
      hasShownWelcome.current = false;
    }
  }, [isOpen, messages.length, isInitializing]);

  // Constante para límite de longitud de mensaje
  const MAX_MESSAGE_LENGTH = 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();

    // Validar longitud del mensaje
    if (message.length > MAX_MESSAGE_LENGTH) {
      // Truncar el mensaje si es muy largo
      const truncated = message.substring(0, MAX_MESSAGE_LENGTH);
      setInputValue(truncated);
      // Mostrar advertencia (opcional, puedes usar un toast aquí)
      return;
    }

    setInputValue('');
    await sendMessage(message);
  };

  // Manejar limpieza de mensajes: resetear posición de scroll
  const handleClearMessages = () => {
    clearMessages();
    scrollPositionRef.current = 0;
    previousMessagesLengthRef.current = 0;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[600px] max-h-[85vh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 md:left-auto md:right-6 md:bottom-6 md:h-[600px] md:w-[450px] md:rounded-2xl md:border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm overflow-hidden">
                  <ChatLogo />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{t('ai.chat.title')}</h2>
                  <p className="text-xs text-white/80">{t('ai.chat.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón Nueva Conversación */}
                {messages.length > 0 && (
                  <button
                    onClick={handleClearMessages}
                    className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label={t('ai.chat.newConversation')}
                    title={t('ai.chat.newConversation')}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}
                {/* Botón Cerrar */}
                <button
                  onClick={closeChat}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label={t('ai.chat.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-gray-600"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white"
                  >
                    <Sparkles className="h-8 w-8" />
                  </motion.div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('ai.chat.welcome')}
                  </h3>
                  <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('ai.chat.welcome.description')}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const messageRef =
                      message.role === 'assistant'
                        ? messageRefs.current.get(message.id)
                        : undefined;
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        messageRef={messageRef}
                      />
                    );
                  })}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('ai.chat.placeholder')}
                  disabled={isLoading}
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className={cn(
                    'flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
                  )}
                  style={{
                    maxHeight: '120px',
                    minHeight: '44px',
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
                    'bg-primary-600 text-white',
                    'hover:bg-primary-700',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-600',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  )}
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
