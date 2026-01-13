import { Bot, AlertCircle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '../../context/AiChatContext';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';
import { ChatMenuButtons } from './ChatMenuButtons';
import type { MenuOption } from '@infrastructure/ai/ChatMenuStructure';
import { CHAT_MENU_STRUCTURE } from '@infrastructure/ai/ChatMenuStructure';
import { useAiChat } from '../../context/AiChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

interface MessageBubbleProps {
  message: ChatMessage;
  messageRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Burbuja de mensaje en el chat
 */
export function MessageBubble({ message, messageRef }: MessageBubbleProps) {
  const { language, t } = useLanguage();
  const { sendMessage, isLoading, closeChat } = useAiChat();
  const { authContext } = useAuth();

  // Usar useNavigate normalmente (debe estar dentro de Router)
  // Si falla, el error se mostrará y podremos depurarlo
  const navigate = useNavigate();

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = React.useState(false);
  const messageContentRef = React.useRef<HTMLDivElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);

  // Combinar refs: usar messageRef si se proporciona, sino usar bubbleRef interno
  const combinedRef = messageRef || bubbleRef;

  // Función para buscar un menú por ID en la estructura completa
  const findMenuById = React.useCallback(
    (menus: MenuOption[], id: string): MenuOption | null => {
      for (const menu of menus) {
        if (menu.id === id) return menu;
        if (menu.subOptions) {
          const found = findMenuById(menu.subOptions, id);
          if (found) return found;
        }
      }
      return null;
    },
    [],
  );

  // Convertir menuOptions a MenuOption para el componente, cargando sub-opciones si existen
  const menuOptions: MenuOption[] = React.useMemo(() => {
    if (!message.metadata?.menuOptions) return [];
    return message.metadata.menuOptions.map((opt) => {
      // Si tiene hasSubOptions, buscar las sub-opciones reales en CHAT_MENU_STRUCTURE
      if (opt.hasSubOptions) {
        const foundMenu = findMenuById(CHAT_MENU_STRUCTURE, opt.id);
        if (foundMenu && foundMenu.subOptions) {
          return {
            ...opt,
            subOptions: foundMenu.subOptions,
          };
        }
      }
      return {
        id: opt.id,
        label: opt.label,
        emoji: opt.emoji,
        action: opt.action,
        path: opt.path,
        query: opt.query,
        subOptions: undefined,
      };
    });
  }, [message.metadata?.menuOptions, findMenuById]);

  const handleMenuOptionClick = React.useCallback(
    async (option: MenuOption) => {
      // PRIORIDAD 1: Si tiene una acción específica (how_to:, query:, info:), ejecutarla directamente
      if (option.action) {
        await sendMessage(option.action);
        return;
      }

      // PRIORIDAD 2: Si tiene query, ejecutarla directamente
      if (option.query) {
        await sendMessage(option.query);
        return;
      }

      // PRIORIDAD 3: Si tiene sub-opciones REALES (cargadas desde CHAT_MENU_STRUCTURE), mostrar el menú
      if (option.subOptions && option.subOptions.length > 0) {
        await sendMessage(`menu:${option.id}`);
        return;
      }

      // PRIORIDAD 4: Si tiene path, mostrar información sobre esa página
      if (option.path) {
        await sendMessage(`info:page:${option.path}`);
        return;
      }

      // Último recurso: intentar mostrar el menú por ID
      await sendMessage(`menu:${option.id}`);
    },
    [sendMessage],
  );

  // Función para copiar el mensaje al portapapeles
  const handleCopyMessage = React.useCallback(async () => {
    if (!messageContentRef.current) return;

    // Obtener texto sin HTML
    const textContent =
      messageContentRef.current.innerText || messageContentRef.current.textContent || '';

    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
    }
  }, []);

  // Manejar clics en enlaces de rutas
  React.useEffect(() => {
    if (!messageContentRef.current || isUser || !navigate) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-route]');

      if (link) {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (route && navigate) {
          // Cerrar el chat antes de navegar
          closeChat();

          // Pequeño delay para que la animación de cierre se vea
          setTimeout(() => {
            try {
              navigate(route);
            } catch (error) {
              // Fallback: usar window.location si navigate falla
              console.warn(
                'Error al navegar con useNavigate, usando window.location:',
                error,
              );
              if (window.location.protocol === 'file:') {
                window.location.hash = route;
              } else {
                window.location.href = route;
              }
            }
          }, 200);
        }
      }
    };

    const contentElement = messageContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleClick);
      return () => {
        contentElement.removeEventListener('click', handleClick);
      };
    }
  }, [navigate, isUser, message.content, closeChat]);

  const formatTime = (date: Date) => {
    const locale = language === 'ca-ES' ? 'ca-ES' : 'es-ES';
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <motion.div
      ref={combinedRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex w-full gap-3 px-4 py-3',
        isUser && 'flex-row-reverse',
        isSystem && 'justify-center',
      )}
    >
      {/* Avatar */}
      {!isSystem && (
        <>
          {isUser ? (
            // Avatar del usuario (mismo que en el header)
            <Avatar
              name={
                `${authContext?.profile.firstName || ''} ${authContext?.profile.lastName || ''}`.trim() ||
                'Usuario'
              }
              initials={authContext?.profile.initials}
              imageUrl={authContext?.profile.avatarUrl}
              size="sm"
              className="h-8 w-8 flex-shrink-0"
            />
          ) : (
            // Avatar del bot
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
          )}
        </>
      )}

      {/* Mensaje */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isUser && 'items-end',
          isSystem && 'items-center max-w-full',
        )}
      >
        {isSystem ? (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4" />
            <span>{message.content}</span>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm shadow-sm relative group',
                isUser
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700',
              )}
            >
              {/* Botones de acción (solo para mensajes del asistente) */}
              {!isUser && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopyMessage}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    aria-label={t('ai.chat.copyMessage')}
                    title={t('ai.chat.copyMessage')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div
                ref={messageContentRef}
                className="break-words prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary-600 [&_a]:dark:text-primary-400 [&_a]:hover:underline [&_a]:font-medium [&_a]:cursor-pointer"
                dangerouslySetInnerHTML={{ __html: message.content }}
                style={{
                  lineHeight: '1.6',
                }}
              />

              {/* Indicador de copiado */}
              {copied && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow-lg z-10">
                  {t('ai.chat.copied')}
                </div>
              )}

              {/* Botones de menú si existen */}
              {menuOptions.length > 0 && (
                <div className="mt-4">
                  <ChatMenuButtons
                    options={menuOptions}
                    onOptionClick={handleMenuOptionClick}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.timestamp)}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
