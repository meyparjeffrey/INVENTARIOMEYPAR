import { Bot, User, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import { ChatMessage } from "../../context/AiChatContext";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Burbuja de mensaje en el chat
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { language } = useLanguage();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

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
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            isUser
              ? "bg-primary-600 text-white"
              : "bg-gradient-to-br from-primary-400 to-primary-600 text-white"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
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
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
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

