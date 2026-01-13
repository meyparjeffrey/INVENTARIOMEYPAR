/**
 * Vista previa interactiva de etiqueta con elementos arrastrables y redimensionables.
 *
 * Permite:
 * - Escalar automáticamente la vista previa para que quepa en la ventana
 * - Arrastrar QR, código y nombre
 * - Redimensionar el QR
 *
 * @module @presentation/components/labels/InteractiveLabelPreview
 */

import * as React from 'react';
import { cn } from '../../lib/cn';
import type { Product } from '@domain/entities';
import type { LabelConfig } from '@application/services/LabelPngService';
import { mmToPx } from '@application/services/LabelPngService';
import { wrapTextToLines } from '@application/services/LabelPngService';

export interface InteractiveLabelPreviewProps {
  /** Producto para mostrar en la vista previa */
  product: Product;
  /** Configuración de la etiqueta */
  config: LabelConfig;
  /** URL del QR code (data URL) */
  qrDataUrl: string | null;
  /** Texto de ubicación */
  locationText?: string;
  /** Texto de almacén */
  warehouseText?: string;
  /** Callback cuando cambia la configuración (offsets o tamaño QR) */
  onConfigChange: (updates: Partial<LabelConfig>) => void;
  /** Ancho máximo del contenedor (px) */
  maxWidth?: number;
  /** Alto máximo del contenedor (px) */
  maxHeight?: number;
}

type DraggableElement = 'qr' | 'code' | 'name' | 'location' | 'warehouse' | null;
type ResizeHandle =
  | 'se'
  | 'sw'
  | 'ne'
  | 'nw'
  | 'code-se'
  | 'code-sw'
  | 'name-se'
  | 'name-sw'
  | 'location-se'
  | 'location-sw'
  | 'warehouse-se'
  | 'warehouse-sw'
  | null;

/**
 * Vista previa interactiva de etiqueta.
 */
export function InteractiveLabelPreview({
  product,
  config,
  qrDataUrl,
  locationText = '',
  warehouseText = '',
  onConfigChange,
  maxWidth = 600,
  maxHeight = 400,
}: InteractiveLabelPreviewProps) {
  const [selectedElement, setSelectedElement] = React.useState<DraggableElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({
    size: 0,
    fontSize: 0,
    x: 0,
    y: 0,
  });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);

  // Calcular dimensiones reales de la etiqueta
  const labelWidthPx = mmToPx(config.widthMm, config.dpi);
  const labelHeightPx = mmToPx(config.heightMm, config.dpi);
  const paddingPx = mmToPx(config.paddingMm, config.dpi);

  // Calcular escala para que quepa en el contenedor manteniendo proporciones exactas
  const scale = React.useMemo(() => {
    const padding = 32; // Padding del contenedor (16px por lado)
    const availableWidth = maxWidth - padding;
    const availableHeight = maxHeight - padding;

    // Calcular escala para ancho y alto por separado
    const scaleX = availableWidth / labelWidthPx;
    const scaleY = availableHeight / labelHeightPx;

    // Usar el menor para mantener proporciones y que quepa completamente
    // Esto asegura que la etiqueta mantenga su relación de aspecto real
    const calculatedScale = Math.min(scaleX, scaleY);

    // No limitar a 1, permitir que se muestre más grande si cabe
    return calculatedScale;
  }, [labelWidthPx, labelHeightPx, maxWidth, maxHeight]);

  const scaledWidth = labelWidthPx * scale;
  const scaledHeight = labelHeightPx * scale;

  // Convertir coordenadas de pantalla a coordenadas de etiqueta (mm)
  // PERMITIR VALORES NEGATIVOS: los elementos pueden estar fuera del área de padding
  const screenToLabel = React.useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!previewRef.current) return { x: 0, y: 0 };
      const rect = previewRef.current.getBoundingClientRect();
      // Las coordenadas del previewRef ya están escaladas por CSS transform
      // Necesitamos dividir por scale para obtener coordenadas en el espacio original
      const labelX = (screenX - rect.left) / scale;
      const labelY = (screenY - rect.top) / scale;
      // Convertir px a mm (restar padding primero)
      // PERMITIR VALORES NEGATIVOS: los elementos pueden estar a la izquierda del padding
      const mmX = (labelX - paddingPx) / (config.dpi / 25.4);
      const mmY = (labelY - paddingPx) / (config.dpi / 25.4);
      // No aplicar Math.max(0, ...) aquí - permitir valores negativos para movimiento libre
      return { x: mmX, y: mmY };
    },
    [scale, paddingPx, config.dpi],
  );

  // Nota: labelToScreen se reserva para uso futuro si se necesita convertir coordenadas de etiqueta a pantalla
  // const labelToScreen = React.useCallback(
  //   (mmX: number, mmY: number): { x: number; y: number } => {
  //     const pxX = (mmX * config.dpi) / 25.4;
  //     const pxY = (mmY * config.dpi) / 25.4;
  //     return { x: (pxX + paddingPx) * scale, y: (pxY + paddingPx) * scale };
  //   },
  //   [scale, paddingPx, config.dpi],
  // );

  // Manejar inicio de arrastre
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent, element: DraggableElement) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedElement(element);
      setIsDragging(true);
      const coords = screenToLabel(e.clientX, e.clientY);
      setDragStart(coords);
    },
    [screenToLabel],
  );

  // Manejar inicio de redimensionado
  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(handle);
      if (handle === 'code-se' || handle === 'code-sw') {
        setResizeStart({
          size: 0,
          fontSize: config.codeFontPx,
          x: e.clientX,
          y: e.clientY,
        });
      } else if (handle === 'name-se' || handle === 'name-sw') {
        setResizeStart({
          size: 0,
          fontSize: config.nameFontPx,
          x: e.clientX,
          y: e.clientY,
        });
      } else if (handle === 'location-se' || handle === 'location-sw') {
        setResizeStart({
          size: 0,
          fontSize: config.locationFontPx,
          x: e.clientX,
          y: e.clientY,
        });
      } else if (handle === 'warehouse-se' || handle === 'warehouse-sw') {
        setResizeStart({
          size: 0,
          fontSize: config.warehouseFontPx,
          x: e.clientX,
          y: e.clientY,
        });
      } else if (
        handle === 'se' ||
        handle === 'sw' ||
        handle === 'ne' ||
        handle === 'nw'
      ) {
        setResizeStart({
          size: config.qrSizeMm,
          fontSize: 0,
          x: e.clientX,
          y: e.clientY,
        });
      }
    },
    [
      config.qrSizeMm,
      config.codeFontPx,
      config.nameFontPx,
      config.locationFontPx,
      config.warehouseFontPx,
    ],
  );

  // Manejar movimiento del mouse
  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedElement) {
        const coords = screenToLabel(e.clientX, e.clientY);
        const deltaX = coords.x - dragStart.x;
        const deltaY = coords.y - dragStart.y;

        const currentOffset = config.offsetsMm[selectedElement];
        // Redondear a 2 decimales máximo
        const newOffset = {
          x: Math.round((currentOffset.x + deltaX) * 100) / 100,
          y: Math.round((currentOffset.y + deltaY) * 100) / 100,
        };

        onConfigChange({
          offsetsMm: {
            ...config.offsetsMm,
            [selectedElement]: newOffset,
          },
        });

        setDragStart(coords);
      } else if (isResizing) {
        if (
          isResizing === 'code-se' ||
          isResizing === 'code-sw' ||
          isResizing === 'name-se' ||
          isResizing === 'name-sw' ||
          isResizing === 'location-se' ||
          isResizing === 'location-sw' ||
          isResizing === 'warehouse-se' ||
          isResizing === 'warehouse-sw'
        ) {
          // Redimensionar fuente de texto
          const deltaY = (e.clientY - resizeStart.y) / scale;
          // Invertir: arrastrar hacia abajo aumenta el tamaño
          const deltaPx = -deltaY;
          let newFontSize: number;
          if (isResizing.startsWith('code')) {
            newFontSize = Math.max(8, Math.min(60, resizeStart.fontSize + deltaPx));
          } else if (isResizing.startsWith('name')) {
            newFontSize = Math.max(8, Math.min(60, resizeStart.fontSize + deltaPx));
          } else if (isResizing.startsWith('location')) {
            newFontSize = Math.max(6, Math.min(60, resizeStart.fontSize + deltaPx));
          } else if (isResizing.startsWith('warehouse')) {
            newFontSize = Math.max(6, Math.min(60, resizeStart.fontSize + deltaPx));
          } else {
            newFontSize = resizeStart.fontSize;
          }

          // Redondear a 2 decimales máximo
          newFontSize = Math.round(newFontSize * 100) / 100;

          if (isResizing.startsWith('code')) {
            onConfigChange({ codeFontPx: newFontSize });
          } else if (isResizing.startsWith('name')) {
            onConfigChange({ nameFontPx: newFontSize });
          } else if (isResizing.startsWith('location')) {
            onConfigChange({ locationFontPx: newFontSize });
          } else if (isResizing.startsWith('warehouse')) {
            onConfigChange({ warehouseFontPx: newFontSize });
          }

          setResizeStart((prev) => ({
            ...prev,
            fontSize: newFontSize,
            x: e.clientX,
            y: e.clientY,
          }));
        } else if (
          isResizing === 'se' ||
          isResizing === 'sw' ||
          isResizing === 'ne' ||
          isResizing === 'nw'
        ) {
          // Redimensionar QR
          const deltaX = (e.clientX - resizeStart.x) / scale;
          const deltaY = (e.clientY - resizeStart.y) / scale;
          const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          // Convertir px a mm
          const deltaMm = delta / (config.dpi / 25.4);

          let newSize = resizeStart.size;
          // Aumentar o disminuir según la dirección del movimiento
          if (deltaX > 0 || deltaY > 0) {
            newSize = resizeStart.size + deltaMm;
          } else {
            newSize = resizeStart.size - deltaMm;
          }

          // Aplicar límites y redondear a 2 decimales
          newSize = Math.max(6, Math.min(25, newSize));
          newSize = Math.round(newSize * 100) / 100;

          onConfigChange({ qrSizeMm: newSize });
          setResizeStart((prev) => ({
            ...prev,
            size: newSize,
            x: e.clientX,
            y: e.clientY,
          }));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setSelectedElement(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    let cursor = '';
    if (isDragging) {
      cursor = 'grabbing';
    } else if (isResizing) {
      const resizingStr = isResizing as string;
      if (
        resizingStr === 'code' ||
        resizingStr === 'name' ||
        resizingStr === 'location' ||
        resizingStr === 'warehouse' ||
        resizingStr.startsWith('code-') ||
        resizingStr.startsWith('name-') ||
        resizingStr.startsWith('location-') ||
        resizingStr.startsWith('warehouse-')
      ) {
        cursor = 'ns-resize';
      } else {
        cursor = 'nwse-resize';
      }
    }
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [
    isDragging,
    isResizing,
    selectedElement,
    dragStart,
    resizeStart,
    screenToLabel,
    scale,
    config,
    onConfigChange,
  ]);

  // Calcular posiciones de los elementos - MOVIMIENTO LIBRE SIN RESTRICCIONES
  // Máxima flexibilidad: todos los elementos pueden moverse libremente sin importar solapamientos
  const qrSizePx = mmToPx(config.qrSizeMm, config.dpi);
  const qrX = paddingPx + mmToPx(config.offsetsMm.qr.x, config.dpi);
  const qrY = paddingPx + mmToPx(config.offsetsMm.qr.y, config.dpi);
  const codeX = paddingPx + mmToPx(config.offsetsMm.code.x, config.dpi);
  const codeY = paddingPx + mmToPx(config.offsetsMm.code.y, config.dpi);
  const nameX = paddingPx + mmToPx(config.offsetsMm.name.x, config.dpi);
  const nameY = paddingPx + mmToPx(config.offsetsMm.name.y, config.dpi);
  const locationX = paddingPx + mmToPx(config.offsetsMm.location.x, config.dpi);
  const locationY = paddingPx + mmToPx(config.offsetsMm.location.y, config.dpi);
  const warehouseX = paddingPx + mmToPx(config.offsetsMm.warehouse.x, config.dpi);
  const warehouseY = paddingPx + mmToPx(config.offsetsMm.warehouse.y, config.dpi);

  // Ancho disponible para el nombre: desde su posición X hasta el borde derecho (con margen)
  // MOVIMIENTO COMPLETAMENTE LIBRE: el nombre puede estar en cualquier posición X
  // El ancho del contenedor se calcula desde nameX hasta el borde derecho, sin importar el QR
  const rightMargin = mmToPx(1, config.dpi);
  const nameContainerLeft = nameX; // Posición X del nombre (puede ser cualquier valor, incluso negativo o a la izquierda del QR)
  const nameContainerRight = labelWidthPx - paddingPx - rightMargin; // Borde derecho de la etiqueta
  // Ancho disponible: desde la posición X del nombre hasta el borde derecho
  // Si nameX es negativo o muy pequeño, el ancho será grande
  // Si nameX está cerca del borde derecho, el ancho será pequeño
  // Pero siempre permitir que el nombre pueda estar en cualquier posición X
  // Usar Math.max para asegurar que el ancho sea siempre positivo, incluso si nameX es mayor que nameContainerRight
  const nameAvailableWidth = Math.max(
    10,
    Math.abs(nameContainerRight - Math.max(0, nameContainerLeft)) * 0.95,
  );

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
      style={{
        maxWidth: `${maxWidth}px`,
        maxHeight: `${maxHeight}px`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}
    >
      {/* Wrapper que tiene el tamaño real después del scale */}
      <div
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          position: 'relative',
        }}
      >
        <div
          ref={previewRef}
          className="relative origin-top-left border border-gray-300"
          style={{
            width: `${labelWidthPx}px`,
            height: `${labelHeightPx}px`,
            background: '#ffffff',
            color: '#000000',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxSizing: 'border-box',
          }}
          title={`${config.widthMm}mm × ${config.heightMm}mm`}
        >
          {/* QR Code */}
          {config.showQr && qrDataUrl && (
            <div
              className={cn(
                'absolute cursor-move select-none',
                selectedElement === 'qr' && 'ring-2 ring-blue-500',
              )}
              style={{
                left: `${qrX}px`,
                top: `${qrY}px`,
                width: `${qrSizePx}px`,
                height: `${qrSizePx}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'qr')}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(selectedElement === 'qr' ? null : 'qr');
              }}
            >
              <img src={qrDataUrl} alt="QR" className="h-full w-full" draggable={false} />
              {/* Handles de redimensionado */}
              {selectedElement === 'qr' && (
                <>
                  <div
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'se');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'sw');
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Código */}
          {config.showCode && (
            <div
              className={cn(
                'absolute cursor-move select-none',
                selectedElement === 'code' && 'ring-2 ring-blue-500',
              )}
              style={{
                left: `${codeX}px`,
                top: `${codeY}px`,
                fontSize: `${config.codeFontPx}px`,
                fontWeight: 700,
                lineHeight: '1',
                margin: 0,
                padding: 0,
                transform: 'none', // Movimiento libre sin centrado automático
              }}
              onMouseDown={(e) => handleMouseDown(e, 'code')}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(selectedElement === 'code' ? null : 'code');
              }}
            >
              {product.code}
              {/* Handles de redimensionado para código (esquinas inferiores) */}
              {selectedElement === 'code' && (
                <>
                  <div
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'code-se');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'code-sw');
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Nombre */}
          {config.showName && (
            <div
              className={cn(
                'absolute cursor-move select-none',
                selectedElement === 'name' && 'ring-2 ring-blue-500',
              )}
              style={{
                left: `${nameContainerLeft}px`,
                top: `${nameY}px`,
                // Ancho del contenedor: desde nameX hasta el borde derecho
                // Si nameX es negativo o muy pequeño, el ancho será grande
                // Si nameX está cerca del borde derecho, el ancho será pequeño
                // Usar Math.max para asegurar que el ancho sea siempre positivo
                width: `${Math.max(10, nameContainerRight - nameContainerLeft)}px`,
                fontSize: `${config.nameFontPx}px`,
                fontWeight: config.nameBold ? 700 : 600,
                lineHeight: `${config.nameFontPx + 2}px`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                wordBreak: 'break-word',
                maxHeight: `${(config.nameFontPx + 2) * config.nameMaxLines}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'name')}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(selectedElement === 'name' ? null : 'name');
              }}
            >
              {(() => {
                // Usar la función existente para dividir el texto en líneas
                // El ancho disponible ya está calculado arriba (nameAvailableWidth)
                const lines = wrapTextToLines({
                  text: product.name,
                  maxWidthPx: nameAvailableWidth,
                  fontPx: config.nameFontPx,
                  isBold: config.nameBold,
                  maxLines: config.nameMaxLines,
                });

                return (
                  <>
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </>
                );
              })()}
              {/* Handles de redimensionado para nombre (esquinas inferiores) */}
              {selectedElement === 'name' && (
                <>
                  <div
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'name-se');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'name-sw');
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Barcode */}
          {config.showBarcode && product.barcode && (
            <div
              className="absolute select-none"
              style={{
                left: `${paddingPx + mmToPx(config.offsetsMm.barcode.x, config.dpi)}px`,
                top: `${paddingPx + mmToPx(config.offsetsMm.barcode.y, config.dpi)}px`,
                right: `${paddingPx}px`,
                fontSize: `${config.barcodeFontPx}px`,
                fontWeight: config.barcodeBold ? 700 : 400,
              }}
            >
              {product.barcode}
            </div>
          )}

          {/* Ubicación */}
          {config.showLocation && locationText && (
            <div
              className={cn(
                'absolute cursor-move select-none',
                selectedElement === 'location' && 'ring-2 ring-blue-500',
              )}
              style={{
                left: `${locationX}px`,
                top: `${locationY}px`,
                fontSize: `${config.locationFontPx}px`,
                fontWeight: config.locationBold ? 700 : 400,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'location')}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(selectedElement === 'location' ? null : 'location');
              }}
            >
              {locationText}
              {/* Handles de redimensionado para ubicación (esquinas inferiores) */}
              {selectedElement === 'location' && (
                <>
                  <div
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'location-se');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'location-sw');
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Almacén */}
          {config.showWarehouse && warehouseText && (
            <div
              className={cn(
                'absolute cursor-move select-none',
                selectedElement === 'warehouse' && 'ring-2 ring-blue-500',
              )}
              style={{
                left: `${warehouseX}px`,
                top: `${warehouseY}px`,
                fontSize: `${config.warehouseFontPx}px`,
                fontWeight: config.warehouseBold ? 700 : 400,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'warehouse')}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(selectedElement === 'warehouse' ? null : 'warehouse');
              }}
            >
              {warehouseText}
              {/* Handles de redimensionado para almacén (esquinas inferiores) */}
              {selectedElement === 'warehouse' && (
                <>
                  <div
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'warehouse-se');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'warehouse-sw');
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
