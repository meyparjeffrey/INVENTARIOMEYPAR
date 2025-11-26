import * as React from "react";
import { cn } from "../../lib/cn";

interface AvatarProps {
  name: string;
  initials?: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base"
};

/**
 * Componente Avatar que muestra iniciales o imagen de perfil.
 */
export function Avatar({ name, initials, imageUrl, size = "md", className }: AvatarProps) {
  const displayInitials = initials ?? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary-600 font-semibold text-white",
        sizeClasses[size],
        className
      )}
      title={name}
    >
      {displayInitials}
    </div>
  );
}

