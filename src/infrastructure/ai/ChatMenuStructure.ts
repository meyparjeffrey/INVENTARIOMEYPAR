/**
 * Estructura de menú interactivo para el chatbot
 * Define todas las opciones y sub-opciones disponibles
 */

import type { AiResponse } from './types';

/**
 * Función para traducir un label del menú según el idioma
 */
export function translateMenuLabel(
  id: string,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  try {
    const translationKey = `ai.chat.menu.${id}`;
    const translated = t(translationKey);
    // Si la traducción no existe, devolver el ID como fallback
    return translated !== translationKey ? translated : id;
  } catch (error) {
    console.warn(`Error traduciendo menú ${id}:`, error);
    return id;
  }
}

/**
 * Traduce recursivamente un menú según el idioma
 */
export function translateMenuStructure(
  menu: MenuOption[],
  t: (key: string, params?: Record<string, string>) => string,
): MenuOption[] {
  try {
    return menu.map((option) => ({
      ...option,
      label: translateMenuLabel(option.id, t),
      subOptions: option.subOptions
        ? translateMenuStructure(option.subOptions, t)
        : undefined,
    }));
  } catch (error) {
    console.warn('Error traduciendo estructura de menú:', error);
    return menu; // Retornar menú sin traducir en caso de error
  }
}

export interface MenuOption {
  id: string;
  label: string;
  icon?: string;
  emoji?: string;
  action?: string; // Acción a ejecutar cuando se hace click
  subOptions?: MenuOption[];
  path?: string; // Ruta a navegar
  query?: string; // Query para consultas de datos
}

/**
 * Estructura principal del menú del chatbot
 */
export const CHAT_MENU_STRUCTURE: MenuOption[] = [
  {
    id: 'products',
    label: 'Productos',
    emoji: '📦',
    subOptions: [
      {
        id: 'products-create',
        label: 'Crear Producto',
        emoji: '➕',
        action: 'how_to:create_product',
        path: '/products/new',
      },
      {
        id: 'products-list',
        label: 'Ver Productos',
        emoji: '📋',
        path: '/products',
      },
      {
        id: 'products-stock',
        label: 'Consultar Stock',
        emoji: '📊',
        action: 'query:stock',
        subOptions: [
          {
            id: 'products-stock-alarm',
            label: 'Productos en Alarma',
            emoji: '⚠️',
            query: 'alarma',
          },
          {
            id: 'products-stock-by-code',
            label: 'Por Código',
            emoji: '🔍',
            action: 'query:stock_by_code',
          },
          {
            id: 'products-stock-low',
            label: 'Stock Bajo',
            emoji: '📉',
            query: 'stock bajo',
          },
        ],
      },
      {
        id: 'products-filter',
        label: 'Filtrar Productos',
        emoji: '🔎',
        action: 'how_to:filter_products',
      },
      {
        id: 'products-export',
        label: 'Exportar',
        emoji: '📥',
        action: 'how_to:export_products',
        path: '/products',
      },
      {
        id: 'products-movements',
        label: 'Historial de Movimientos',
        emoji: '📜',
        action: 'query:product_movements',
      },
    ],
  },
  {
    id: 'movements',
    label: 'Movimientos',
    emoji: '🔄',
    subOptions: [
      {
        id: 'movements-list',
        label: 'Ver Movimientos',
        emoji: '📋',
        path: '/movements',
      },
      {
        id: 'movements-create-in',
        label: 'Registrar Entrada',
        emoji: '⬆️',
        action: 'how_to:create_movement_in',
      },
      {
        id: 'movements-create-out',
        label: 'Registrar Salida',
        emoji: '⬇️',
        action: 'how_to:create_movement_out',
      },
      {
        id: 'movements-filter',
        label: 'Filtrar Movimientos',
        emoji: '🔎',
        action: 'how_to:filter_movements',
      },
      {
        id: 'movements-export',
        label: 'Exportar',
        emoji: '📥',
        action: 'how_to:export_movements',
      },
      {
        id: 'movements-by-product',
        label: 'Por Producto',
        emoji: '🔍',
        action: 'query:movements_by_product',
      },
    ],
  },
  {
    id: 'batches',
    label: 'Lotes',
    emoji: '📦',
    subOptions: [
      {
        id: 'batches-list',
        label: 'Ver Lotes',
        emoji: '📋',
        path: '/batches',
      },
      {
        id: 'batches-expiring',
        label: 'Por Caducar',
        emoji: '⏰',
        query: 'lotes por caducar',
      },
      {
        id: 'batches-expired',
        label: 'Caducados',
        emoji: '❌',
        query: 'lotes caducados',
      },
      {
        id: 'batches-defective',
        label: 'Defectuosos',
        emoji: '⚠️',
        query: 'lotes defectuosos',
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alarmas',
    emoji: '🚨',
    subOptions: [
      {
        id: 'alerts-list',
        label: 'Ver Alarmas',
        emoji: '📋',
        path: '/alerts',
      },
      {
        id: 'alerts-stock',
        label: 'Stock Bajo',
        emoji: '📉',
        query: 'productos en alarma',
      },
      {
        id: 'alerts-batches',
        label: 'Lotes Críticos',
        emoji: '⏰',
        query: 'lotes críticos',
      },
    ],
  },
  {
    id: 'scanner',
    label: 'Escáner',
    emoji: '📷',
    subOptions: [
      {
        id: 'scanner-use',
        label: 'Usar Escáner',
        emoji: '🔍',
        action: 'how_to:use_scanner',
        path: '/scanner',
      },
      {
        id: 'scanner-usb',
        label: 'Escáner USB',
        emoji: '🔌',
        action: 'how_to:scanner_usb',
      },
      {
        id: 'scanner-camera',
        label: 'Cámara',
        emoji: '📸',
        action: 'how_to:scanner_camera',
      },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    emoji: '📊',
    subOptions: [
      {
        id: 'dashboard-view',
        label: 'Ver Dashboard',
        emoji: '🏠',
        path: '/dashboard',
      },
      {
        id: 'dashboard-kpis',
        label: 'KPIs',
        emoji: '📈',
        action: 'info:dashboard_kpis',
      },
      {
        id: 'dashboard-charts',
        label: 'Gráficos',
        emoji: '📊',
        action: 'info:dashboard_charts',
      },
      {
        id: 'dashboard-activity',
        label: 'Actividad Reciente',
        emoji: '🕐',
        action: 'info:dashboard_activity',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Configuración',
    emoji: '⚙️',
    subOptions: [
      {
        id: 'settings-view',
        label: 'Ver Configuración',
        emoji: '🔧',
        path: '/settings',
      },
      {
        id: 'settings-language',
        label: 'Idioma',
        emoji: '🌐',
        action: 'how_to:change_language',
      },
      {
        id: 'settings-theme',
        label: 'Tema',
        emoji: '🎨',
        action: 'how_to:change_theme',
      },
      {
        id: 'settings-profile',
        label: 'Perfil',
        emoji: '👤',
        path: '/profile',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    emoji: '👑',
    subOptions: [
      {
        id: 'admin-view',
        label: 'Panel Admin',
        emoji: '🛡️',
        path: '/admin',
      },
      {
        id: 'admin-users',
        label: 'Usuarios',
        emoji: '👥',
        action: 'how_to:manage_users',
      },
      {
        id: 'admin-permissions',
        label: 'Permisos',
        emoji: '🔐',
        action: 'info:permissions',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    emoji: '📄',
    subOptions: [
      {
        id: 'reports-export',
        label: 'Exportar Datos',
        emoji: '📥',
        action: 'how_to:export_data',
      },
      {
        id: 'reports-excel',
        label: 'Exportar Excel',
        emoji: '📊',
        action: 'how_to:export_excel',
      },
      {
        id: 'reports-csv',
        label: 'Exportar CSV',
        emoji: '📋',
        action: 'how_to:export_csv',
      },
    ],
  },
];

/**
 * Genera respuesta con menú interactivo
 */
export function generateMenuResponse(
  menuId?: string,
  parentId?: string,
  t?: (key: string, params?: Record<string, string>) => string,
): AiResponse {
  // Traducir la estructura del menú si hay función de traducción
  const menuStructure = t
    ? translateMenuStructure(CHAT_MENU_STRUCTURE, t)
    : CHAT_MENU_STRUCTURE;

  let options: MenuOption[] = [];
  let title = t ? t('ai.chat.menu.mainQuestion') : '¿En qué puedo ayudarte?';
  let description = t
    ? t('ai.chat.menu.mainDescription')
    : 'Selecciona una opción para continuar:';

  if (!menuId) {
    // Menú principal
    options = menuStructure;
    title = t ? t('ai.chat.menu.mainTitle') : '👋 ¡Hola! Soy MEYPAR IA';
    description = t
      ? t('ai.chat.menu.mainDescription')
      : 'Elige una categoría para comenzar:';
  } else {
    // Buscar el menú seleccionado
    const findMenu = (menus: MenuOption[], id: string): MenuOption | null => {
      for (const menu of menus) {
        if (menu.id === id) return menu;
        if (menu.subOptions) {
          const found = findMenu(menu.subOptions, id);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedMenu = findMenu(menuStructure, menuId);
    if (selectedMenu && selectedMenu.subOptions) {
      options = selectedMenu.subOptions;
      title = `${selectedMenu.emoji || ''} ${selectedMenu.label}`;
      description = t
        ? t('ai.chat.menu.subOptions', { menu: selectedMenu.label })
        : `Opciones disponibles para ${selectedMenu.label.toLowerCase()}:`;
    }
  }

  // Generar contenido HTML simple (los botones se renderizarán con React)
  let content = `<strong>${title}</strong><br /><br />`;
  content += `${description}`;

  return {
    content,
    sources: options.filter((o) => o.path).map((o) => o.path!),
    menuId: menuId,
    menuOptions: options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      emoji: opt.emoji,
      action: opt.action,
      path: opt.path,
      query: opt.query,
      hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0,
    })),
  };
}
