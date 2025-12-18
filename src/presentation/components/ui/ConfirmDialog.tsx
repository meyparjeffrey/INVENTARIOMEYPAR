import { AlertTriangle } from 'lucide-react';
import * as React from 'react';
import {
  DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog';
import { Button } from './Button';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Componente de diálogo de confirmación personalizado.
 *
 * Reemplaza window.confirm con un diálogo centrado y estilizado
 * que mantiene la coherencia visual de la aplicación.
 *
 * @component
 * @param {ConfirmDialogProps} props - Propiedades del componente
 * @param {boolean} props.isOpen - Indica si el diálogo está abierto
 * @param {() => void} props.onClose - Función a ejecutar al cerrar el diálogo
 * @param {() => void} props.onConfirm - Función a ejecutar al confirmar
 * @param {string} props.title - Título del diálogo
 * @param {string} props.message - Mensaje de confirmación
 * @param {string} [props.confirmText] - Texto del botón de confirmar
 * @param {string} [props.cancelText] - Texto del botón de cancelar
 * @param {"default" | "destructive"} [props.variant="destructive"] - Variante del botón de confirmar
 * @example
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Eliminar producto"
 *   message="¿Estás seguro de eliminar este producto?"
 * />
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'destructive',
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
    // No cerramos aquí, dejamos que el componente padre maneje el cierre después de que onConfirm complete
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <DialogContent size="sm" className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {title || t('common.confirm') || 'Confirmar'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-row justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="min-w-[100px]">
              {cancelText || t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'primary'}
              onClick={handleConfirm}
              className="min-w-[100px]"
            >
              {confirmText || t('common.confirm') || 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </DialogRoot>
  );
}
