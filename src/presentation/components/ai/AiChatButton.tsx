import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import { useAiChat } from "../../context/AiChatContext";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../lib/cn";
import chatLogo from "../../../assets/logochat.svg";

/**
 * Botón flotante de chat de IA en la parte inferior izquierda.
 * Incluye animaciones modernas y indicador de actividad.
 */
export function AiChatButton() {
  const { t } = useLanguage();
  const { isOpen, toggleChat } = useAiChat();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleChat}
      className={cn(
        "fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
        "bg-gradient-to-br from-primary-500 to-primary-600 text-white",
        "hover:from-primary-600 hover:to-primary-700",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        "dark:shadow-xl"
      )}
      aria-label={t("ai.chat.open")}
      title={t("ai.chat.open")}
    >
      {/* Logo */}
      <img
        src={chatLogo}
        alt="MEYPAR IA"
        className="h-8 w-8 object-contain filter brightness-0 invert"
        onError={(e) => {
          // Fallback si el logo no carga
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const fallback = document.createElement("div");
          fallback.className = "flex h-6 w-6 items-center justify-center text-white font-bold text-lg";
          fallback.textContent = "IA";
          target.parentElement?.appendChild(fallback);
        }}
      />
      
      {/* Partículas decorativas cuando está abierto */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-full bg-primary-400/30 blur-xl"
        />
      )}
      
      {/* Indicador de pulso */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary-300"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Icono de sparkles decorativo */}
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Sparkles className="h-4 w-4 text-yellow-300" />
      </motion.div>
    </motion.button>
  );
}

