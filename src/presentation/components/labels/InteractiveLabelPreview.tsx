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

type DraggableElement = 'qr' | 'code' | 'name' | null;
type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'code' | 'name' | null;

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
  const screenToLabel = React.useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!previewRef.current) return { x: 0, y: 0 };
      const rect = previewRef.current.getBoundingClientRect();
      // Las coordenadas del previewRef ya están escaladas por CSS transform
      // Necesitamos dividir por scale para obtener coordenadas en el espacio original
      const labelX = (screenX - rect.left) / scale;
      const labelY = (screenY - rect.top) / scale;
      // Convertir px a mm (restar padding primero)
      const mmX = (labelX - paddingPx) / (config.dpi / 25.4);
      const mmY = (labelY - paddingPx) / (config.dpi / 25.4);
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
    [config.qrSizeMm, config.codeFontPx, config.nameFontPx],
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
          isResizing === 'name-sw'
        ) {
          // Redimensionar fuente de texto
          const deltaY = (e.clientY - resizeStart.y) / scale;
          // Invertir: arrastrar hacia abajo aumenta el tamaño
          const deltaPx = -deltaY;
          let newFontSize: number;
          if (isResizing.startsWith('code')) {
            newFontSize = Math.max(8, Math.min(60, resizeStart.fontSize + deltaPx));
          } else {
            newFontSize = Math.max(8, Math.min(40, resizeStart.fontSize + deltaPx));
          }

          // Redondear a 2 decimales máximo
          newFontSize = Math.round(newFontSize * 100) / 100;

          if (isResizing.startsWith('code')) {
            onConfigChange({ codeFontPx: newFontSize });
          } else if (isResizing.startsWith('name')) {
            onConfigChange({ nameFontPx: newFontSize });
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
      if (isResizing === 'code' || isResizing === 'name') {
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

  // Calcular posiciones de los elementos
  const qrSizePx = mmToPx(config.qrSizeMm, config.dpi);
  const qrX = paddingPx + mmToPx(config.offsetsMm.qr.x, config.dpi);
  const qrY = paddingPx + mmToPx(config.offsetsMm.qr.y, config.dpi);
  // codeX se calcula pero no se usa directamente ya que el código se centra con el nombre
  // const codeX = paddingPx + mmToPx(config.offsetsMm.code.x, config.dpi);
  const codeY = paddingPx + mmToPx(config.offsetsMm.code.y, config.dpi);
  const nameX = paddingPx + mmToPx(config.offsetsMm.name.x, config.dpi);
  const nameY = paddingPx + mmToPx(config.offsetsMm.name.y, config.dpi);

  // Calcular límites del nombre: no debe superponerse con el QR ni salirse del borde derecho
  // Añadir márgenes adicionales para mejor legibilidad
  const qrRightEdge = config.showQr && qrDataUrl ? qrX + qrSizePx : 0;

  // Margen adicional entre el QR y el texto del nombre (1mm)
  const marginBetweenQrAndText = mmToPx(1, config.dpi);

  // El límite izquierdo del contenedor del nombre es el máximo entre:
  // - La posición X del nombre
  // - El borde derecho del QR + margen adicional (si existe y está a la izquierda del nombre)
  const nameContainerLeft = Math.max(nameX, qrRightEdge + marginBetweenQrAndText);

  // Margen adicional a la derecha de la etiqueta (1mm)
  const rightMargin = mmToPx(1, config.dpi);

  // El límite derecho del contenedor es el borde de la etiqueta menos el padding y el margen derecho
  const nameContainerRight = labelWidthPx - paddingPx - rightMargin;
  // Reducir un 15% adicional para asegurar que el texto centrado no se salga de los límites
  const nameAvailableWidth = Math.max(
    10,
    (nameContainerRight - nameContainerLeft) * 0.85,
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
          {config.showCode &&
            (() => {
              // Calcular el centro del contenedor del nombre para centrar el código
              const codeCenterX =
                nameContainerLeft + (nameContainerRight - nameContainerLeft) / 2;

              return (
                <div
                  className={cn(
                    'absolute cursor-move select-none',
                    selectedElement === 'code' && 'ring-2 ring-blue-500',
                  )}
                  style={{
                    left: `${codeCenterX}px`,
                    top: `${codeY}px`,
                    fontSize: `${config.codeFontPx}px`,
                    fontWeight: 700,
                    lineHeight: '1',
                    margin: 0,
                    padding: 0,
                    transform: 'translateX(-50%)', // Centrar el texto desde su punto medio
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
              );
            })()}

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
                right: `${labelWidthPx - nameContainerRight}px`,
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
                      handleResizeStart(e, 'name');
                    }}
                  />
                  <div
                    className="absolute -bottom-1 -left-1 h-3 w-3 cursor-nesw-resize rounded-full bg-blue-500 ring-2 ring-white"
                    style={{ transform: 'scale(1.5)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e, 'name');
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
              className="absolute select-none"
              style={{
                left: `${paddingPx + mmToPx(config.offsetsMm.location.x, config.dpi)}px`,
                top: `${paddingPx + mmToPx(config.offsetsMm.location.y, config.dpi)}px`,
                right: `${paddingPx}px`,
                fontSize: `${config.locationFontPx}px`,
                fontWeight: config.locationBold ? 700 : 400,
              }}
            >
              {locationText}
            </div>
          )}

          {/* Almacén */}
          {config.showWarehouse && warehouseText && (
            <div
              className="absolute select-none"
              style={{
                left: `${paddingPx + mmToPx(config.offsetsMm.warehouse.x, config.dpi)}px`,
                top: `${paddingPx + mmToPx(config.offsetsMm.warehouse.y, config.dpi)}px`,
                right: `${paddingPx}px`,
                fontSize: `${config.warehouseFontPx}px`,
                fontWeight: config.warehouseBold ? 700 : 400,
              }}
            >
              {warehouseText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
