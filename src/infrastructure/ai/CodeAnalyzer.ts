import type {
  ComponentInfo,
  HookInfo,
  ProjectStructure,
  RouteInfo,
  ServiceInfo
} from "./types";

/**
 * Analizador de código que extrae información sobre la estructura del proyecto.
 * Como estamos en el navegador, usamos una combinación de análisis estático
 * y base de conocimiento estructurada.
 */
export class CodeAnalyzer {
  private static instance: CodeAnalyzer;
  private cachedStructure: ProjectStructure | null = null;

  private constructor() {}

  static getInstance(): CodeAnalyzer {
    if (!CodeAnalyzer.instance) {
      CodeAnalyzer.instance = new CodeAnalyzer();
    }
    return CodeAnalyzer.instance;
  }

  /**
   * Analiza el proyecto y devuelve su estructura
   */
  async analyzeProject(): Promise<ProjectStructure> {
    try {
      // Si ya tenemos una estructura cachead, la devolvemos
      if (this.cachedStructure) {
        return this.cachedStructure;
      }

    // Analizar rutas
    const routes = this.analyzeRoutes();

    // Extraer información de componentes, servicios y hooks
    const components = this.getComponentsInfo();
    const services = this.getServicesInfo();
    const hooks = this.getHooksInfo();
    const permissions = this.getPermissionsInfo();

      this.cachedStructure = {
        routes,
        components,
        services,
        hooks,
        permissions,
        lastAnalyzed: new Date()
      };

      return this.cachedStructure;
    } catch (error) {
      console.error("Error analizando proyecto:", error);
      // Retornar estructura mínima en caso de error
      return {
        routes: [],
        components: [],
        services: [],
        hooks: [],
        permissions: [],
        lastAnalyzed: new Date()
      };
    }
  }

  /**
   * Analiza las rutas del proyecto
   */
  private analyzeRoutes(): RouteInfo[] {
    // Mapeo de rutas basado en la estructura del proyecto
    const routeMap: Record<string, RouteInfo> = {
      "/dashboard": {
        path: "/dashboard",
        label: "Dashboard",
        description: "Página principal con resumen y KPIs"
      },
      "/products": {
        path: "/products",
        label: "Productos",
        permission: "products.view",
        description: "Ver y gestionar productos del inventario"
      },
      "/products/new": {
        path: "/products/new",
        label: "Nuevo Producto",
        permission: "products.create",
        description: "Crear un nuevo producto"
      },
      "/products/:id": {
        path: "/products/:id",
        label: "Detalle Producto",
        permission: "products.view",
        description: "Ver detalles de un producto específico"
      },
      "/products/:id/edit": {
        path: "/products/:id/edit",
        label: "Editar Producto",
        permission: "products.edit",
        description: "Editar un producto existente"
      },
      "/batches": {
        path: "/batches",
        label: "Lotes",
        permission: "batches.view",
        description: "Gestionar lotes de productos"
      },
      "/movements": {
        path: "/movements",
        label: "Movimientos",
        permission: "movements.view",
        description: "Ver movimientos de inventario (entradas/salidas)"
      },
      "/alerts": {
        path: "/alerts",
        label: "Alarmas",
        permission: "products.view",
        description: "Ver alertas de stock bajo y lotes críticos"
      },
      "/scanner": {
        path: "/scanner",
        label: "Escáner",
        permission: "scanner.use",
        description: "Escanear códigos de barras y QR"
      },
      "/chat": {
        path: "/chat",
        label: "Chat",
        permission: "chat.view",
        description: "Chat interno entre usuarios"
      },
      "/reports": {
        path: "/reports",
        label: "Reportes",
        permission: "reports.view",
        description: "Ver y exportar reportes"
      },
      "/settings": {
        path: "/settings",
        label: "Configuración",
        description: "Configuración de usuario"
      },
      "/admin": {
        path: "/admin",
        label: "Administración",
        adminOnly: true,
        permission: "admin.users",
        description: "Panel de administración"
      }
    };

    return Object.values(routeMap);
  }

  /**
   * Obtiene información sobre componentes disponibles
   */
  private getComponentsInfo(): ComponentInfo[] {
    return [
      {
        name: "ProductForm",
        filePath: "src/presentation/components/products/ProductForm.tsx",
        description: "Formulario para crear/editar productos",
        permissions: ["products.create", "products.edit"]
      },
      {
        name: "ProductTable",
        filePath: "src/presentation/components/products/ProductTable.tsx",
        description: "Tabla que muestra la lista de productos",
        permissions: ["products.view"]
      },
      {
        name: "AiChatButton",
        filePath: "src/presentation/components/ai/AiChatButton.tsx",
        description: "Botón flotante para abrir el chat de IA"
      },
      {
        name: "AiChatPanel",
        filePath: "src/presentation/components/ai/AiChatPanel.tsx",
        description: "Panel de chat con el asistente de IA"
      },
      {
        name: "KPICard",
        filePath: "src/presentation/components/dashboard/KPICard.tsx",
        description: "Tarjeta que muestra un KPI en el dashboard"
      },
      {
        name: "GlobalSearch",
        filePath: "src/presentation/components/ui/GlobalSearch.tsx",
        description: "Búsqueda global de productos y lotes"
      }
    ];
  }

  /**
   * Obtiene información sobre servicios disponibles
   */
  private getServicesInfo(): ServiceInfo[] {
    return [
      {
        name: "AuthService",
        methods: ["login", "logout", "getCurrentUser", "hasPermission"],
        description: "Servicio de autenticación y permisos"
      },
      {
        name: "ProductService",
        methods: [
          "listProducts",
          "getProductById",
          "createProduct",
          "updateProduct",
          "deleteProduct"
        ],
        description: "Servicio para gestionar productos"
      },
      {
        name: "AiChatService",
        methods: ["sendMessage", "analyzeQuestion", "generateResponse"],
        description: "Servicio del chat de IA"
      }
    ];
  }

  /**
   * Obtiene información sobre hooks disponibles
   */
  private getHooksInfo(): HookInfo[] {
    return [
      {
        name: "useAuth",
        description: "Hook para acceder al contexto de autenticación",
        returns: "AuthContext"
      },
      {
        name: "useProducts",
        description: "Hook para gestionar productos",
        returns: "Product data and operations"
      },
      {
        name: "useAiChat",
        description: "Hook para interactuar con el chat de IA",
        returns: "Chat state and methods"
      },
      {
        name: "useDashboard",
        description: "Hook para obtener datos del dashboard",
        returns: "Dashboard statistics"
      }
    ];
  }

  /**
   * Obtiene lista de permisos disponibles
   */
  private getPermissionsInfo(): string[] {
    return [
      "products.view",
      "products.create",
      "products.edit",
      "products.delete",
      "products.import",
      "batches.view",
      "batches.create",
      "batches.edit",
      "batches.mark_defective",
      "batches.block",
      "movements.view",
      "movements.create_in",
      "movements.create_out",
      "movements.adjust",
      "scanner.use",
      "scanner.camera",
      "scanner.bulk_mode",
      "reports.view",
      "reports.export_excel",
      "reports.export_pdf",
      "reports.schedule",
      "ai.chat",
      "ai.suggestions_view",
      "ai.suggestions_accept",
      "chat.view",
      "chat.send",
      "suppliers.view",
      "suppliers.manage",
      "admin.users",
      "admin.permissions",
      "admin.settings",
      "admin.audit",
      "admin.backup"
    ];
  }

  /**
   * Busca rutas relacionadas con una palabra clave
   */
  findRoutesByKeyword(keyword: string): RouteInfo[] {
    const structure = this.cachedStructure;
    if (!structure) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase();
    return structure.routes.filter(
      (route) =>
        route.path.toLowerCase().includes(lowerKeyword) ||
        route.label?.toLowerCase().includes(lowerKeyword) ||
        route.description?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Busca componentes relacionados con una palabra clave
   */
  findComponentsByKeyword(keyword: string): ComponentInfo[] {
    const structure = this.cachedStructure;
    if (!structure) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase();
    return structure.components.filter(
      (component) =>
        component.name.toLowerCase().includes(lowerKeyword) ||
        component.description?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Obtiene información sobre un permiso específico
   */
  getPermissionInfo(permissionKey: string): {
    key: string;
    description: string;
    roles: string[];
  } | null {
    const permissionDescriptions: Record<
      string,
      { description: string; roles: string[] }
    > = {
      "products.view": {
        description: "Ver productos",
        roles: ["ADMIN", "WAREHOUSE", "VIEWER"]
      },
      "products.create": {
        description: "Crear productos",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "products.edit": {
        description: "Editar productos",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "products.delete": {
        description: "Eliminar productos",
        roles: ["ADMIN"]
      },
      "batches.view": {
        description: "Ver lotes",
        roles: ["ADMIN", "WAREHOUSE", "VIEWER"]
      },
      "batches.create": {
        description: "Crear lotes",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "scanner.use": {
        description: "Usar escáner USB",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "scanner.camera": {
        description: "Usar escáner por cámara",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "reports.view": {
        description: "Ver reportes",
        roles: ["ADMIN", "WAREHOUSE", "VIEWER"]
      },
      "reports.export_excel": {
        description: "Exportar a Excel",
        roles: ["ADMIN", "WAREHOUSE"]
      },
      "ai.chat": {
        description: "Usar chat con IA",
        roles: ["ADMIN", "WAREHOUSE", "VIEWER"]
      }
    };

    const info = permissionDescriptions[permissionKey];
    if (!info) {
      return null;
    }

    return {
      key: permissionKey,
      ...info
    };
  }

  /**
   * Invalida el cache para forzar un nuevo análisis
   */
  invalidateCache(): void {
    this.cachedStructure = null;
  }
}

