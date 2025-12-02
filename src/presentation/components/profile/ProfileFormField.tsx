import * as React from "react";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileFormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  validation?: {
    isValid: boolean;
    message?: string;
  };
  maxLength?: number;
  showCharCount?: boolean;
}

/**
 * Campo de formulario con validación en tiempo real y contador de caracteres.
 */
export function ProfileFormField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  validation,
  maxLength,
  showCharCount = false
}: ProfileFormFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const showValidation = isFocused || (value.length > 0 && validation !== undefined);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {showCharCount && maxLength && (
          <span
            className={`text-xs ${
              value.length > maxLength * 0.9
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          maxLength={maxLength}
          className={`pr-10 ${
            validation && showValidation
              ? validation.isValid
                ? "border-green-500 focus:ring-green-500"
                : "border-red-500 focus:ring-red-500"
              : ""
          }`}
        />
        {validation && showValidation && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {validation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {validation && showValidation && validation.message && (
        <AnimatePresence>
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-1.5 text-xs ${
              validation.isValid
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {!validation.isValid && <AlertCircle className="h-3 w-3" />}
            {validation.message}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}

