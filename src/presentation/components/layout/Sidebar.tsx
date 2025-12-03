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
import { Logo } from "../ui/Logo";

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
      <div className={cn(
        "flex h-16 items-center justify-center border-b px-2",
        effectiveTheme === "dark" 
          ? "border-gray-700 bg-gray-800/95" 
          : "border-gray-200 bg-gray-50"
      )}>
        <Logo 
          className={collapsed ? "h-8 max-w-8" : "h-10 max-w-48"} 
          color={effectiveTheme === "dark" ? "white" : "black"}
        />
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

