import { Bot, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import { ChatMessage } from "../../context/AiChatContext";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import { ChatMenuButtons } from "./ChatMenuButtons";
import type { MenuOption } from "@infrastructure/ai/ChatMenuStructure";
import { CHAT_MENU_STRUCTURE } from "@infrastructure/ai/ChatMenuStructure";
import { useAiChat } from "../../context/AiChatContext";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../ui/Avatar";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Burbuja de mensaje en el chat
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { language } = useLanguage();
  const { sendMessage, isLoading } = useAiChat();
  const { authContext } = useAuth();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  
  // Función para buscar un menú por ID en la estructura completa
  const findMenuById = React.useCallback((menus: MenuOption[], id: string): MenuOption | null => {
    for (const menu of menus) {
      if (menu.id === id) return menu;
      if (menu.subOptions) {
        const found = findMenuById(menu.subOptions, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

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
            subOptions: foundMenu.subOptions
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
        subOptions: undefined
      };
    });
  }, [message.metadata?.menuOptions, findMenuById]);

  const handleMenuOptionClick = React.useCallback(async (option: MenuOption) => {
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
  }, [sendMessage]);

  const formatTime = (date: Date) => {
    const locale = language === "ca-ES" ? "ca-ES" : "es-ES";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        isUser && "flex-row-reverse",
        isSystem && "justify-center"
      )}
    >
      {/* Avatar */}
      {!isSystem && (
        <>
          {isUser ? (
            // Avatar del usuario (mismo que en el header)
            <Avatar
              name={`${authContext?.profile.firstName || ""} ${authContext?.profile.lastName || ""}`.trim() || "Usuario"}
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
          "flex flex-col gap-1 max-w-[70%]",
          isUser && "items-end",
          isSystem && "items-center max-w-full"
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
                "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                isUser
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              )}
            >
              <div 
                className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none"
              >
                {message.content.split('\n').map((line, index, array) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              
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

