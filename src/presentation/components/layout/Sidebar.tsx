import {
  AlertTriangle,
  ArrowLeftRight,
  FileText,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  ScanLine,
  Settings,
  Users
} from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PermissionKey } from "@domain/entities";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../lib/cn";

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { path: "/products", labelKey: "nav.products", icon: Package, permission: "products.view" },
  { path: "/batches", labelKey: "nav.batches", icon: Layers, permission: "batches.view" },
  { path: "/movements", labelKey: "nav.movements", icon: ArrowLeftRight, permission: "movements.view" },
  { path: "/alerts", labelKey: "nav.alerts", icon: AlertTriangle, permission: "products.view" },
  { path: "/scanner", labelKey: "nav.scanner", icon: ScanLine, permission: "scanner.use" },
  { path: "/chat", labelKey: "nav.chat", icon: MessageSquare, permission: "chat.view" },
  { path: "/reports", labelKey: "nav.reports", icon: FileText, permission: "reports.view" },
  { path: "/settings", labelKey: "nav.settings", icon: Settings },
  { path: "/admin", labelKey: "nav.admin", icon: Users, adminOnly: true }
];

/**
 * Sidebar de navegación con fondo oscuro y items con iconos.
 */
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authContext } = useAuth();
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);

  // Obtener estado de colapso desde settings si existe
  React.useEffect(() => {
    if (authContext?.settings?.sidebarCollapsed !== undefined) {
      setCollapsed(authContext.settings.sidebarCollapsed);
    }
  }, [authContext?.settings?.sidebarCollapsed]);

  const canAccess = (item: NavItem): boolean => {
    if (item.adminOnly && authContext?.profile.role !== "ADMIN") {
      return false;
    }
    if (item.permission) {
      return authContext?.permissions.includes(item.permission) ?? false;
    }
    return true;
  };

  const visibleItems = navItems.filter(canAccess);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-gray-800 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center">
            {effectiveTheme === "dark" ? (
              <svg
                viewBox="0 0 1190.55 377.973"
                className="h-8 w-auto"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 311.558594 209.234375 L 401.433594 209.234375 L 401.433594 163.921875 L 311.558594 163.921875 L 311.558594 119.109375 L 414.386719 119.109375 L 414.386719 73.796875 L 262.167969 73.796875 L 262.167969 305.324219 L 417.523438 305.324219 L 417.523438 260.023438 L 311.558594 260.023438 Z M 311.558594 209.234375 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 525.578125 162.296875 L 483.460938 73.796875 L 426.664062 73.796875 L 499.972656 221.140625 L 499.972656 305.324219 L 549.363281 305.324219 L 549.363281 221.140625 L 622.664062 73.796875 L 567.109375 73.796875 Z M 525.578125 162.296875 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 752.769531 164.78125 C 752.769531 171.242188 747.53125 176.484375 741.066406 176.484375 L 684.484375 176.484375 L 684.484375 119.113281 L 741.066406 119.113281 C 747.53125 119.113281 752.769531 124.347656 752.769531 130.816406 Z M 755.335938 73.796875 L 635.097656 73.796875 L 635.097656 305.328125 L 684.484375 305.328125 L 684.484375 221.136719 L 755.335938 221.136719 C 781.195312 221.136719 802.160156 200.171875 802.160156 174.316406 L 802.160156 120.621094 C 802.160156 94.757812 781.195312 73.796875 755.335938 73.796875 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 1056.84375 119.113281 L 1113.421875 119.113281 C 1119.886719 119.113281 1125.125 124.347656 1125.125 130.816406 L 1125.125 164.78125 C 1125.125 171.242188 1119.886719 176.484375 1113.421875 176.484375 L 1056.84375 176.484375 Z M 1184.941406 305.328125 L 1143.40625 218.378906 C 1161.523438 211.914062 1174.515625 194.652344 1174.515625 174.316406 L 1174.515625 120.621094 C 1174.515625 94.761719 1153.554688 73.800781 1127.691406 73.800781 L 1007.453125 73.800781 L 1007.453125 305.328125 L 1056.84375 305.328125 L 1056.84375 221.136719 L 1090.765625 221.136719 L 1130.980469 305.328125 Z M 1184.941406 305.328125 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 913.6875 217.621094 L 884.558594 125.070312 L 883.921875 125.070312 L 854.460938 217.621094 Z M 995.246094 305.328125 L 942.160156 305.328125 L 927.59375 257.429688 L 841.851562 257.429688 L 825.34375 305.328125 L 774.210938 305.328125 L 856.734375 72.648438 L 913.03125 72.648438 Z M 995.246094 305.328125 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 149.238281 73.652344 L 121.0625 206.546875 L 93.988281 73.652344 L 5.613281 73.652344 L 5.613281 305.328125 L 54.71875 305.328125 L 54.71875 118.574219 L 95.605469 305.328125 L 145 305.328125 L 188.507812 116.371094 L 188.507812 305.328125 L 237.613281 305.328125 L 237.613281 73.652344 Z M 149.238281 73.652344 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 237.613281 5.695312 L 5.609375 5.695312 L 5.609375 39.421875 L 237.613281 39.421875 Z M 237.613281 5.695312 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 237.613281 338.550781 L 5.609375 338.550781 L 5.609375 372.277344 L 237.613281 372.277344 Z M 237.613281 338.550781 " />
                </g>
              </svg>
            ) : (
              <Package className="h-6 w-6 text-primary-400" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {effectiveTheme === "dark" ? (
              <svg
                viewBox="0 0 1190.55 377.973"
                className="h-8 w-auto"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 311.558594 209.234375 L 401.433594 209.234375 L 401.433594 163.921875 L 311.558594 163.921875 L 311.558594 119.109375 L 414.386719 119.109375 L 414.386719 73.796875 L 262.167969 73.796875 L 262.167969 305.324219 L 417.523438 305.324219 L 417.523438 260.023438 L 311.558594 260.023438 Z M 311.558594 209.234375 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 525.578125 162.296875 L 483.460938 73.796875 L 426.664062 73.796875 L 499.972656 221.140625 L 499.972656 305.324219 L 549.363281 305.324219 L 549.363281 221.140625 L 622.664062 73.796875 L 567.109375 73.796875 Z M 525.578125 162.296875 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 752.769531 164.78125 C 752.769531 171.242188 747.53125 176.484375 741.066406 176.484375 L 684.484375 176.484375 L 684.484375 119.113281 L 741.066406 119.113281 C 747.53125 119.113281 752.769531 124.347656 752.769531 130.816406 Z M 755.335938 73.796875 L 635.097656 73.796875 L 635.097656 305.328125 L 684.484375 305.328125 L 684.484375 221.136719 L 755.335938 221.136719 C 781.195312 221.136719 802.160156 200.171875 802.160156 174.316406 L 802.160156 120.621094 C 802.160156 94.757812 781.195312 73.796875 755.335938 73.796875 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 1056.84375 119.113281 L 1113.421875 119.113281 C 1119.886719 119.113281 1125.125 124.347656 1125.125 130.816406 L 1125.125 164.78125 C 1125.125 171.242188 1119.886719 176.484375 1113.421875 176.484375 L 1056.84375 176.484375 Z M 1184.941406 305.328125 L 1143.40625 218.378906 C 1161.523438 211.914062 1174.515625 194.652344 1174.515625 174.316406 L 1174.515625 120.621094 C 1174.515625 94.761719 1153.554688 73.800781 1127.691406 73.800781 L 1007.453125 73.800781 L 1007.453125 305.328125 L 1056.84375 305.328125 L 1056.84375 221.136719 L 1090.765625 221.136719 L 1130.980469 305.328125 Z M 1184.941406 305.328125 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 913.6875 217.621094 L 884.558594 125.070312 L 883.921875 125.070312 L 854.460938 217.621094 Z M 995.246094 305.328125 L 942.160156 305.328125 L 927.59375 257.429688 L 841.851562 257.429688 L 825.34375 305.328125 L 774.210938 305.328125 L 856.734375 72.648438 L 913.03125 72.648438 Z M 995.246094 305.328125 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 149.238281 73.652344 L 121.0625 206.546875 L 93.988281 73.652344 L 5.613281 73.652344 L 5.613281 305.328125 L 54.71875 305.328125 L 54.71875 118.574219 L 95.605469 305.328125 L 145 305.328125 L 188.507812 116.371094 L 188.507812 305.328125 L 237.613281 305.328125 L 237.613281 73.652344 Z M 149.238281 73.652344 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 237.613281 5.695312 L 5.609375 5.695312 L 5.609375 39.421875 L 237.613281 39.421875 Z M 237.613281 5.695312 " />
                  <path fillRule="nonzero" fill="#ffffff" fillOpacity="1" d="M 237.613281 338.550781 L 5.609375 338.550781 L 5.609375 372.277344 L 237.613281 372.277344 Z M 237.613281 338.550781 " />
                </g>
              </svg>
            ) : (
              <Package className="h-6 w-6 text-primary-400" />
            )}
            <span className="text-lg font-bold">{t("app.name")}</span>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
                    isActive
                      ? "bg-primary-600 text-white shadow-md"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-sm hover:scale-[1.02]",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!collapsed && <span className="text-sm font-medium">{t(item.labelKey)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle colapso */}
      <div className="border-t border-gray-700 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-gray-300 transition hover:bg-gray-700"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? (
            <ArrowLeftRight className="h-5 w-5 rotate-90" />
          ) : (
            <ArrowLeftRight className="h-5 w-5 -rotate-90" />
          )}
        </button>
      </div>
    </aside>
  );
}

