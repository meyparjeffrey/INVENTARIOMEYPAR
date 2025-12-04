import * as React from "react";
import { cn } from "../../lib/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

/**
 * Componente Skeleton para mostrar estados de carga.
 */
export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
  style,
  ...props
}: SkeletonProps) {
  const baseStyles: React.CSSProperties = {
    width: width || (variant === "circular" ? "40px" : "100%"),
    height: height || (variant === "circular" ? "40px" : "20px"),
    ...style
  };

  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-gray-700",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded",
        variant === "text" && "rounded",
        animation === "pulse" && "animate-pulse",
        animation === "wave" && "animate-shimmer",
        className
      )}
      style={baseStyles}
      {...props}
    />
  );
}

/**
 * Skeleton para filas de tabla.
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" height="16px" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton para tarjetas de productos.
 */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height="20px" className="mb-2" />
          <Skeleton variant="text" width="80%" height="16px" />
        </div>
        <Skeleton variant="circular" width="24px" height="24px" />
      </div>
      <div className="mb-3 space-y-2">
        <Skeleton variant="text" width="40%" height="14px" />
        <Skeleton variant="rectangular" width="100%" height="8px" className="rounded-full" />
        <Skeleton variant="text" width="60%" height="12px" />
      </div>
      <div className="mb-3 space-y-1">
        <Skeleton variant="text" width="50%" height="12px" />
        <Skeleton variant="text" width="70%" height="12px" />
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <Skeleton variant="circular" width="32px" height="32px" />
        <Skeleton variant="circular" width="32px" height="32px" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
    </div>
  );
}
