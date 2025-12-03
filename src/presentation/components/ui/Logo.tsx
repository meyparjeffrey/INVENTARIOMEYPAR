import * as React from "react";
import { useTheme } from "../../context/ThemeContext";

interface LogoProps {
  className?: string;
  color?: "white" | "black" | "auto";
}

/**
 * Componente del logo MEYPAR
 */
export function Logo({ className = "h-8 w-auto", color = "auto" }: LogoProps) {
  const { effectiveTheme } = useTheme();

  // Determinar el color según el prop o el tema
  const getFillColor = React.useCallback((pathId: string): string => {
    if (color === "white") {
      return "#ffffff";
    }
    if (color === "black") {
      // Para el logo en modo claro, usar los colores originales
      if (pathId === "path7") return "#e62144"; // Rojo
      if (pathId === "path8") return "#7f7f7f"; // Gris
      return "#000000"; // Negro para el texto
    }
    // Auto: usar el tema efectivo
    if (effectiveTheme === "dark") {
      return "#ffffff";
    }
    // Modo claro: usar colores originales
    if (pathId === "path7") return "#e62144";
    if (pathId === "path8") return "#7f7f7f";
    return "#000000";
  }, [color, effectiveTheme]);

  return (
    <svg
      viewBox="0 0 1190.55 377.973"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <g>
        <path
          fillRule="nonzero"
          fill={getFillColor("path1")}
          fillOpacity="1"
          d="M 311.558594 209.234375 L 401.433594 209.234375 L 401.433594 163.921875 L 311.558594 163.921875 L 311.558594 119.109375 L 414.386719 119.109375 L 414.386719 73.796875 L 262.167969 73.796875 L 262.167969 305.324219 L 417.523438 305.324219 L 417.523438 260.023438 L 311.558594 260.023438 Z M 311.558594 209.234375 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path2")}
          fillOpacity="1"
          d="M 525.578125 162.296875 L 483.460938 73.796875 L 426.664062 73.796875 L 499.972656 221.140625 L 499.972656 305.324219 L 549.363281 305.324219 L 549.363281 221.140625 L 622.664062 73.796875 L 567.109375 73.796875 Z M 525.578125 162.296875 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path3")}
          fillOpacity="1"
          d="M 752.769531 164.78125 C 752.769531 171.242188 747.53125 176.484375 741.066406 176.484375 L 684.484375 176.484375 L 684.484375 119.113281 L 741.066406 119.113281 C 747.53125 119.113281 752.769531 124.347656 752.769531 130.816406 Z M 755.335938 73.796875 L 635.097656 73.796875 L 635.097656 305.328125 L 684.484375 305.328125 L 684.484375 221.136719 L 755.335938 221.136719 C 781.195312 221.136719 802.160156 200.171875 802.160156 174.316406 L 802.160156 120.621094 C 802.160156 94.757812 781.195312 73.796875 755.335938 73.796875 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path4")}
          fillOpacity="1"
          d="M 1056.84375 119.113281 L 1113.421875 119.113281 C 1119.886719 119.113281 1125.125 124.347656 1125.125 130.816406 L 1125.125 164.78125 C 1125.125 171.242188 1119.886719 176.484375 1113.421875 176.484375 L 1056.84375 176.484375 Z M 1184.941406 305.328125 L 1143.40625 218.378906 C 1161.523438 211.914062 1174.515625 194.652344 1174.515625 174.316406 L 1174.515625 120.621094 C 1174.515625 94.761719 1153.554688 73.800781 1127.691406 73.800781 L 1007.453125 73.800781 L 1007.453125 305.328125 L 1056.84375 305.328125 L 1056.84375 221.136719 L 1090.765625 221.136719 L 1130.980469 305.328125 Z M 1184.941406 305.328125 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path5")}
          fillOpacity="1"
          d="M 913.6875 217.621094 L 884.558594 125.070312 L 883.921875 125.070312 L 854.460938 217.621094 Z M 995.246094 305.328125 L 942.160156 305.328125 L 927.59375 257.429688 L 841.851562 257.429688 L 825.34375 305.328125 L 774.210938 305.328125 L 856.734375 72.648438 L 913.03125 72.648438 Z M 995.246094 305.328125 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path6")}
          fillOpacity="1"
          d="M 149.238281 73.652344 L 121.0625 206.546875 L 93.988281 73.652344 L 5.613281 73.652344 L 5.613281 305.328125 L 54.71875 305.328125 L 54.71875 118.574219 L 95.605469 305.328125 L 145 305.328125 L 188.507812 116.371094 L 188.507812 305.328125 L 237.613281 305.328125 L 237.613281 73.652344 Z M 149.238281 73.652344 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path7")}
          fillOpacity="1"
          d="M 237.613281 5.695312 L 5.609375 5.695312 L 5.609375 39.421875 L 237.613281 39.421875 Z M 237.613281 5.695312 "
        />
        <path
          fillRule="nonzero"
          fill={getFillColor("path8")}
          fillOpacity="1"
          d="M 237.613281 338.550781 L 5.609375 338.550781 L 5.609375 372.277344 L 237.613281 372.277344 Z M 237.613281 338.550781 "
        />
      </g>
    </svg>
  );
}

