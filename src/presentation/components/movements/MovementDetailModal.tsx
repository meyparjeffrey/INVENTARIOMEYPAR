import { Calendar, User, Package, FileText, Tag } from 'lucide-react';
import * as React from 'react';
import type { InventoryMovement } from '@domain/entities';
import { Dialog } from '../ui/Dialog';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../lib/cn';

interface MovementDetailModalProps {
  movement: InventoryMovement & {
    product?: { code: string; name: string };
    userFirstName?: string | null;
    userLastName?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal para ver el detalle completo de un movimiento.
 */
export function MovementDetailModal({
  movement,
  isOpen,
  onClose,
}: MovementDetailModalProps) {
  const { t } = useLanguage();
  const date = new Date(movement.movementDate);

  const movementTypeConfig: Record<string, { label: string; color: string }> = {
    IN: { label: t('movements.type.IN'), color: 'text-green-600 dark:text-green-400' },
    OUT: { label: t('movements.type.OUT'), color: 'text-red-600 dark:text-red-400' },
    ADJUSTMENT: {
      label: t('movements.type.ADJUSTMENT'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    TRANSFER: {
      label: t('movements.type.TRANSFER'),
      color: 'text-purple-600 dark:text-purple-400',
    },
  };

  const typeConfig = movementTypeConfig[movement.movementType] || {
    label: movement.movementType,
    color: '',
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('movements.detail')} size="lg">
      <div className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              {t('movements.date')}
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
              {date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Tag className="h-4 w-4" />
              {t('movements.type')}
            </div>
            <div className={cn('mt-1 text-lg font-semibold', typeConfig.color)}>
              {typeConfig.label}
            </div>
            {movement.reasonCategory && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t(`movements.category.${movement.reasonCategory}`)}
              </div>
            )}
          </div>
        </div>

        {/* Producto */}
        {movement.product && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Package className="h-4 w-4" />
              {t('movements.product')}
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
              {movement.product.name}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t('table.code')}: {movement.product.code}
            </div>
          </div>
        )}

        {/* Usuario */}
        {(movement.userFirstName || movement.userLastName) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <User className="h-4 w-4" />
              {t('movements.user')}
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">
              {movement.userFirstName || ''} {movement.userLastName || ''}
            </div>
          </div>
        )}

        {/* Cantidades */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('movements.quantity')}
            </div>
            <div
              className={cn(
                'mt-1 text-2xl font-bold',
                movement.movementType === 'IN'
                  ? 'text-green-600 dark:text-green-400'
                  : movement.movementType === 'OUT'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-50',
              )}
            >
              {movement.movementType === 'IN'
                ? '+'
                : movement.movementType === 'OUT'
                  ? '-'
                  : ''}
              {movement.quantity}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('movements.stockBefore')}
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
              {movement.quantityBefore}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('movements.stockAfter')}
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
              {movement.quantityAfter}
            </div>
          </div>
        </div>

        {/* Personal */}
        {movement.requestReason && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              {t('movements.person')}
            </div>
            <div className="mt-2 text-gray-900 dark:text-gray-50">
              {movement.requestReason}
            </div>
          </div>
        )}

        {/* Comentarios (detalles de cambios) */}
        {movement.comments && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              {t('movements.comments')} / {t('movements.details')}
            </div>
            <div className="mt-2 whitespace-pre-wrap text-gray-900 dark:text-gray-50">
              {movement.comments}
            </div>
          </div>
        )}

        {/* Información adicional */}
        {(movement.referenceDocument ||
          movement.sourceLocation ||
          movement.destinationLocation) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('movements.additionalInfo')}
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-900 dark:text-gray-50">
              {movement.referenceDocument && (
                <div>
                  <span className="font-medium">{t('movements.referenceDocument')}:</span>{' '}
                  {movement.referenceDocument}
                </div>
              )}
              {movement.sourceLocation && (
                <div>
                  <span className="font-medium">{t('movements.sourceLocation')}:</span>{' '}
                  {movement.sourceLocation}
                </div>
              )}
              {movement.destinationLocation && (
                <div>
                  <span className="font-medium">
                    {t('movements.destinationLocation')}:
                  </span>{' '}
                  {movement.destinationLocation}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
