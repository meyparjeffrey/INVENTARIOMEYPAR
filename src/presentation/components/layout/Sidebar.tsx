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
import { cn } from "../../lib/cn";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/products", label: "Productos", icon: Package, permission: "products.view" },
  { path: "/batches", label: "Lotes", icon: Layers, permission: "batches.view" },
  { path: "/movements", label: "Movimientos", icon: ArrowLeftRight, permission: "movements.view" },
  { path: "/alerts", label: "Alarmas", icon: AlertTriangle, permission: "products.view" },
  { path: "/scanner", label: "Escáner", icon: ScanLine, permission: "scanner.use" },
  { path: "/chat", label: "Chat", icon: MessageSquare, permission: "chat.view" },
  { path: "/reports", label: "Reportes", icon: FileText, permission: "reports.view" },
  { path: "/settings", label: "Configuración", icon: Settings },
  { path: "/admin", label: "Admin", icon: Users, adminOnly: true }
];

/**
 * Sidebar de navegación con fondo oscuro y items con iconos.
 */
export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authContext } = useAuth();
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
          <Package className="h-6 w-6 text-primary-400" />
        ) : (
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary-400" />
            <span className="text-lg font-bold">Inventario</span>
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
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

