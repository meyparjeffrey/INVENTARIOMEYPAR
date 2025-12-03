/**
 * Tipos para el sistema de análisis de código e IA
 */

export interface RouteInfo {
  path: string;
  label?: string;
  permission?: string;
  adminOnly?: boolean;
  description?: string;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  props?: string[];
  description?: string;
  permissions?: string[];
}

export interface ServiceInfo {
  name: string;
  methods: string[];
  description?: string;
}

export interface HookInfo {
  name: string;
  description?: string;
  returns?: string;
}

export interface ProjectStructure {
  routes: RouteInfo[];
  components: ComponentInfo[];
  services: ServiceInfo[];
  hooks: HookInfo[];
  permissions: string[];
  lastAnalyzed: Date;
}

export type QuestionCategory =
  | "how_to"
  | "data_query"
  | "permissions"
  | "features"
  | "general";

export interface QuestionIntent {
  category: QuestionCategory;
  keywords: string[];
  confidence: number;
  action?: string;
}

export interface AiResponse {
  content: string;
  sources?: string[];
  requiresPermission?: string;
  suggestedActions?: Array<{
    label: string;
    path?: string;
    permission?: string;
  }>;
  menuOptions?: Array<{
    id: string;
    label: string;
    emoji?: string;
    action?: string;
    path?: string;
    query?: string;
    hasSubOptions?: boolean;
  }>;
  menuId?: string; // ID del menú actual para navegación
}

