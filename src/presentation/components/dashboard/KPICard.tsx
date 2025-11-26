import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/cn";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down";
  };
  accentColor: "green" | "amber" | "red" | "blue";
  onClick?: () => void;
}

const accentColors = {
  green: "border-green-500 bg-green-50 dark:bg-green-900/20",
  amber: "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
  red: "border-red-500 bg-red-50 dark:bg-red-900/20",
  blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
};

/**
 * Tarjeta KPI con borde coloreado, icono, valor y tendencia opcional.
 */
export function KPICard({
  title,
  value,
  icon,
  trend,
  accentColor,
  onClick
}: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 p-4 transition",
        accentColors[accentColor],
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {trend.direction === "up" ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={cn(
                  "font-medium",
                  trend.direction === "up" ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.value}%
              </span>
              <span className="text-gray-500 dark:text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
    </div>
  );
}

