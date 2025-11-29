import { motion } from "framer-motion";
import * as React from "react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Indicador visual de que la IA está escribiendo
 */
export function TypingIndicator() {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center space-x-2 px-4 py-2">
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{t("ai.chat.typing")}</span>
    </div>
  );
}

