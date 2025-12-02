import * as React from "react";
import { cn } from "../../lib/cn";
import type { AvatarSize, AvatarShape, AvatarShadowIntensity } from "@domain/entities";

interface AvatarProps {
  name: string;
  initials?: string;
  imageUrl?: string | null;
  size?: AvatarSize | "sm" | "md" | "lg"; // Mantener compatibilidad con valores antiguos
  customSize?: number;
  borderEnabled?: boolean;
  borderWidth?: number;
  borderColor?: string;
  shadowEnabled?: boolean;
  shadowIntensity?: AvatarShadowIntensity;
  shape?: AvatarShape;
  animationEnabled?: boolean;
  highContrast?: boolean;
  altText?: string;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg"
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-full",
  square: "rounded-none",
  rounded: "rounded-lg"
};

const shadowClasses: Record<AvatarShadowIntensity, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg"
};

/**
 * Componente Avatar que muestra iniciales o imagen de perfil con configuración avanzada.
 */
export function Avatar({
  name,
  initials,
  imageUrl,
  size = "md",
  customSize,
  borderEnabled = false,
  borderWidth = 2,
  borderColor = "#DC2626",
  shadowEnabled = true,
  shadowIntensity = "md",
  shape = "circle",
  animationEnabled = true,
  highContrast = false,
  altText,
  className
}: AvatarProps) {
  const displayInitials = initials ?? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const effectiveSize = size === "custom" && customSize ? customSize : size;
  const sizeClass = typeof effectiveSize === "number" ? "" : sizeClasses[effectiveSize] || sizeClasses.md;
  const shapeClass = shapeClasses[shape];
  const shadowClass = shadowEnabled ? shadowClasses[shadowIntensity] : "";
  
  const borderStyle = borderEnabled
    ? {
        borderWidth: `${borderWidth}px`,
        borderColor: borderColor,
        borderStyle: "solid" as const
      }
    : {};

  const customSizeStyle = typeof effectiveSize === "number" ? {
    width: `${effectiveSize}px`,
    height: `${effectiveSize}px`,
    fontSize: `${Math.max(12, effectiveSize * 0.4)}px`
  } : {};

  const baseClasses = cn(
    "flex items-center justify-center object-cover font-semibold text-white transition-all duration-200",
    shapeClass,
    sizeClass,
    shadowClass,
    animationEnabled && "hover:scale-110",
    highContrast && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800",
    className
  );

  const bgColor = highContrast ? "bg-gray-900 dark:bg-white" : "bg-primary-600";
  const textColor = highContrast ? "text-white dark:text-gray-900" : "text-white";

  const ariaLabel = altText || `${name} avatar`;
  const displayAltText = altText || name;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={displayAltText}
        aria-label={ariaLabel}
        role="img"
        className={cn(baseClasses, "object-cover")}
        style={{
          ...borderStyle,
          ...customSizeStyle
        }}
      />
    );
  }

  return (
    <div
      className={cn(baseClasses, bgColor, textColor)}
      style={{
        ...borderStyle,
        ...customSizeStyle
      }}
      title={name}
      role="img"
      aria-label={ariaLabel}
    >
      {displayInitials}
    </div>
  );
}

