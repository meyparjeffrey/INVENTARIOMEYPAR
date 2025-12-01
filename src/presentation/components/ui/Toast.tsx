import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib/cn";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook para usar el sistema de toasts
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/**
 * Proveedor del sistema de toasts
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: ToastData = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback((title: string, description?: string) => {
    addToast({ type: "success", title, description });
  }, [addToast]);

  const error = React.useCallback((title: string, description?: string) => {
    addToast({ type: "error", title, description, duration: 8000 });
  }, [addToast]);

  const warning = React.useCallback((title: string, description?: string) => {
    addToast({ type: "warning", title, description });
  }, [addToast]);

  const info = React.useCallback((title: string, description?: string) => {
    addToast({ type: "info", title, description });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Contenedor de toasts
 */
function ToastContainer({ 
  toasts, 
  onClose 
}: { 
  toasts: ToastData[]; 
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Componente Toast individual
 */
function Toast({ 
  toast, 
  onClose 
}: { 
  toast: ToastData; 
  onClose: () => void;
}) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  const borderColors: Record<ToastType, string> = {
    success: "border-l-emerald-500",
    error: "border-l-red-500",
    warning: "border-l-amber-500",
    info: "border-l-blue-500"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 bg-white p-4 shadow-lg dark:bg-gray-800",
        borderColors[toast.type]
      )}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

