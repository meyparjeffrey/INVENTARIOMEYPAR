import * as React from "react";
import { cn } from "../../lib/cn";

interface ResizableColumnHeaderProps {
  children: React.ReactNode;
  onResize: (width: number) => void;
  initialWidth?: number;
  minWidth?: number;
  className?: string;
}

/**
 * Header de columna redimensionable (como Excel).
 * Permite arrastrar el borde derecho para cambiar el ancho.
 */
export function ResizableColumnHeader({
  children,
  onResize,
  initialWidth,
  minWidth = 50,
  className
}: ResizableColumnHeaderProps) {
  const [width, setWidth] = React.useState<number | undefined>(initialWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const headerRef = React.useRef<HTMLTableCellElement>(null);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (initialWidth !== undefined) {
      setWidth(initialWidth);
    } else if (headerRef.current) {
      // Si no hay ancho inicial, usar el ancho actual del elemento
      setWidth(headerRef.current.offsetWidth);
    }
  }, [initialWidth]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = headerRef.current.offsetWidth || minWidth;
    
    const mouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      
      // Actualizar el ancho del header inmediatamente
      if (headerRef.current) {
        headerRef.current.style.width = `${newWidth}px`;
        headerRef.current.style.minWidth = `${newWidth}px`;
        headerRef.current.style.maxWidth = `${newWidth}px`;
      }
      
      setWidth(newWidth);
      onResize(newWidth);
    };

    const mouseUpHandler = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [minWidth, onResize]);

  return (
    <th
      ref={headerRef}
      className={cn("relative", className)}
      style={{ 
        width: width ? `${width}px` : "auto", 
        minWidth: `${minWidth}px`,
        maxWidth: width ? `${width}px` : "none"
      }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary-500 transition-colors",
          "group-hover:bg-primary-400",
          isResizing && "bg-primary-600"
        )}
        style={{ zIndex: 10, width: "4px", marginRight: "-2px" }}
        title="Arrastra para redimensionar"
        aria-label="Redimensionar columna"
      />
    </th>
  );
}

