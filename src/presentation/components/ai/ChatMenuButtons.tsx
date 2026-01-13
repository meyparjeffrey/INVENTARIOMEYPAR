import { ChevronRight } from 'lucide-react';
import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import type { MenuOption } from '@infrastructure/ai/ChatMenuStructure';

interface ChatMenuButtonsProps {
  options: MenuOption[];
  onOptionClick: (option: MenuOption) => void;
  isLoading?: boolean;
}

/**
 * Componente de botones de menú interactivo para el chat
 */
export function ChatMenuButtons({
  options,
  onOptionClick,
  isLoading = false,
}: ChatMenuButtonsProps) {
  // Validar que options exista y no esté vacío
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      {options.map((option, index) => {
        const hasSubOptions = option.subOptions && option.subOptions.length > 0;

        return (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isLoading && onOptionClick(option)}
            disabled={isLoading}
            className={cn(
              'group flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left transition-all',
              'hover:border-primary-500 hover:bg-primary-50 hover:shadow-md',
              'dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-primary-900/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            )}
          >
            {/* Emoji/Icono */}
            <span className="text-2xl flex-shrink-0">{option.emoji || '📌'}</span>

            {/* Label */}
            <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
              {option.label}
            </span>

            {/* Indicador de sub-opciones */}
            {hasSubOptions && (
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
