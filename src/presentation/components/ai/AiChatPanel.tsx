import { Send, X, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useAiChat } from "../../context/AiChatContext";
import { useLanguage } from "../../context/LanguageContext";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { cn } from "../../lib/cn";

/**
 * Panel de chat de IA que se desliza desde abajo
 */
export function AiChatPanel() {
  const { t } = useLanguage();
  const { isOpen, closeChat, messages, sendMessage, isLoading, aiEngine, setAiEngine } = useAiChat();
  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-focus en el input cuando se abre el panel
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AiChatPanel] handleSubmit llamado, inputValue:", inputValue, "isLoading:", isLoading);
    if (!inputValue.trim() || isLoading) {
      console.log("[AiChatPanel] handleSubmit cancelado - input vacío o cargando");
      return;
    }

    const message = inputValue.trim();
    console.log("[AiChatPanel] Enviando mensaje:", message);
    setInputValue("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[600px] max-h-[85vh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 md:left-auto md:right-6 md:bottom-6 md:h-[600px] md:w-[450px] md:rounded-2xl md:border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm overflow-hidden">
                  <img
                    src="/logochat.svg"
                    alt="MEYPAR IA Logo"
                    className="h-full w-full object-contain p-1.5"
                    onError={(e) => {
                      // Fallback si el logo no carga
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{t("ai.chat.title")}</h2>
                  <p className="text-xs text-white/80">{t("ai.chat.subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle entre sistemas de IA */}
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 backdrop-blur-sm">
                  <button
                    onClick={() => setAiEngine("local")}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      aiEngine === "local"
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                    title={t("ai.chat.engine.local")}
                  >
                    {t("ai.chat.engine.local")}
                  </button>
                  <button
                    onClick={() => setAiEngine("gemini")}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      aiEngine === "gemini"
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                    title={t("ai.chat.engine.gemini")}
                  >
                    {t("ai.chat.engine.gemini")}
                  </button>
                </div>
                <button
                  onClick={closeChat}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label={t("ai.chat.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-gray-600">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white"
                  >
                    <Sparkles className="h-8 w-8" />
                  </motion.div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("ai.chat.welcome")}
                  </h3>
                  <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
                    {t("ai.chat.welcome.description")}
                  </p>
                  {/* Preguntas sugeridas */}
                  <div className="mt-6 flex flex-col gap-2">
                    {[
                      t("ai.chat.suggestions.how-create-product"),
                      t("ai.chat.suggestions.low-stock"),
                      t("ai.chat.suggestions.scanner")
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={async () => {
                          await sendMessage(suggestion);
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    console.log("[AiChatPanel] Renderizando mensajes, cantidad:", messages.length);
                    return null;
                  })()}
                  {messages.map((message) => {
                    console.log("[AiChatPanel] Renderizando mensaje:", message.id, message.role, message.content.substring(0, 50));
                    return <MessageBubble key={message.id} message={message} />;
                  })}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 dark:border-gray-700">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    console.log("[AiChatPanel] onChange llamado, nuevo valor:", e.target.value);
                    setInputValue(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("ai.chat.placeholder")}
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm",
                    "placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  )}
                  style={{
                    maxHeight: "120px",
                    minHeight: "44px"
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                    "bg-primary-600 text-white",
                    "hover:bg-primary-700",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-600",
                    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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

