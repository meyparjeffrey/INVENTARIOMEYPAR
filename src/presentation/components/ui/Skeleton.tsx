import * as React from "react";
import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
  /** Ancho del skeleton (ej: "100%", "200px") */
  width?: string;
  /** Alto del skeleton (ej: "20px", "100%") */
  height?: string;
  /** Forma del skeleton */
  variant?: "text" | "circular" | "rectangular" | "rounded";
  /** Animación activa */
  animate?: boolean;
}

/**
 * Componente Skeleton para estados de carga
 */
export function Skeleton({
  className,
  width,
  height,
  variant = "text",
  animate = true
}: SkeletonProps) {
  const variantStyles = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-lg"
  };

  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-gray-700",
        variantStyles[variant],
        animate && "animate-pulse",
        className
      )}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton para una línea de texto
 */
export function SkeletonText({ 
  lines = 1, 
  className 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="16px"
          width={i === lines - 1 && lines > 1 ? "70%" : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton para un avatar
 */
export function SkeletonAvatar({ 
  size = "md",
  className 
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizes[size], className)}
    />
  );
}

/**
 * Skeleton para una tarjeta KPI
 */
export function SkeletonKPICard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" height="14px" width="60%" />
          <Skeleton variant="text" height="32px" width="40%" />
          <Skeleton variant="text" height="12px" width="50%" />
        </div>
        <Skeleton variant="circular" className="h-12 w-12" />
      </div>
    </div>
  );
}

/**
 * Skeleton para una fila de tabla
 */
export function SkeletonTableRow({ 
  columns = 5,
  className 
}: { 
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={cn("border-b border-gray-200 dark:border-gray-700", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton 
            variant="text" 
            height="16px" 
            width={`${60 + Math.random() * 40}%`} 
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton para tabla completa
 */
export function SkeletonTable({ 
  rows = 5, 
  columns = 5,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700", className)}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton variant="text" height="14px" width="80px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton para un gráfico
 */
export function SkeletonChart({ 
  height = "256px",
  className 
}: { 
  height?: string;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800",
        className
      )}
      style={{ height }}
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton variant="text" height="20px" width="150px" />
        <div className="flex gap-2">
          <Skeleton variant="text" height="16px" width="60px" />
          <Skeleton variant="text" height="16px" width="60px" />
        </div>
      </div>
      <div className="flex h-[calc(100%-40px)] items-end justify-between gap-2 px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton 
              variant="rounded" 
              className="w-full" 
              height={`${30 + Math.random() * 70}%`}
            />
            <Skeleton variant="text" height="12px" width="30px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para una tarjeta de producto
 */
export function SkeletonProductCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800",
      className
    )}>
      <div className="flex gap-4">
        <Skeleton variant="rounded" className="h-16 w-16 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height="18px" width="70%" />
          <Skeleton variant="text" height="14px" width="50%" />
          <div className="flex gap-2">
            <Skeleton variant="rounded" height="24px" width="60px" />
            <Skeleton variant="rounded" height="24px" width="60px" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para el Dashboard completo
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" height="32px" width="180px" />
          <Skeleton variant="text" height="14px" width="220px" />
        </div>
        <Skeleton variant="rounded" height="36px" width="100px" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <Skeleton variant="text" height="14px" width="60%" className="mb-2" />
            <Skeleton variant="text" height="28px" width="40%" />
          </div>
        ))}
      </div>

      {/* Chart and Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonChart className="lg:col-span-2" height="300px" />
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton variant="text" height="20px" width="100px" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="circular" className="h-8 w-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="text" height="14px" width="80%" />
                  <Skeleton variant="text" height="12px" width="50%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para lista de productos
 */
export function SkeletonProductList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" height="32px" width="150px" />
          <Skeleton variant="text" height="14px" width="180px" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" height="36px" width="120px" />
          <Skeleton variant="rounded" height="36px" width="120px" />
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <Skeleton variant="rounded" height="40px" className="flex-1 max-w-md" />
        <Skeleton variant="rounded" height="40px" width="100px" />
        <Skeleton variant="rounded" height="40px" width="100px" />
      </div>

      {/* Table */}
      <SkeletonTable rows={items} columns={7} />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" height="14px" width="150px" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" height="32px" width="80px" />
          <Skeleton variant="rounded" height="32px" width="32px" />
          <Skeleton variant="rounded" height="32px" width="32px" />
          <Skeleton variant="rounded" height="32px" width="32px" />
          <Skeleton variant="rounded" height="32px" width="80px" />
        </div>
      </div>
    </div>
  );
}

