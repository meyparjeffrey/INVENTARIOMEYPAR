import type { PermissionKey, UserProfile } from '@domain/entities';
import type { ProductRepository } from '@domain/repositories/ProductRepository';
import type { InventoryMovementRepository } from '@domain/repositories/InventoryMovementRepository';
import type { AiResponse } from '@infrastructure/ai/types';
import { ResponseEngine } from '@infrastructure/ai/ResponseEngine';
import { CodeAnalyzer } from '@infrastructure/ai/CodeAnalyzer';
import { SupabaseProductRepository } from '@infrastructure/repositories/SupabaseProductRepository';
import { SupabaseInventoryMovementRepository } from '@infrastructure/repositories/SupabaseInventoryMovementRepository';
import {
  CHAT_MENU_STRUCTURE,
  generateMenuResponse,
  type MenuOption,
} from '@infrastructure/ai/ChatMenuStructure';

/**
 * Servicio que procesa mensajes del chat de IA
 */
export class AiChatService {
  private responseEngine: ResponseEngine;
  private codeAnalyzer: CodeAnalyzer;
  private productRepository: ProductRepository;
  private movementRepository: InventoryMovementRepository;
  private language: 'es-ES' | 'ca-ES';

  constructor(
    productRepository?: ProductRepository,
    movementRepository?: InventoryMovementRepository,
    language: 'es-ES' | 'ca-ES' = 'es-ES',
  ) {
    this.language = language;
    this.responseEngine = new ResponseEngine(language);
    this.codeAnalyzer = CodeAnalyzer.getInstance();
    this.productRepository = productRepository || new SupabaseProductRepository();
    this.movementRepository =
      movementRepository || new SupabaseInventoryMovementRepository();
  }

  /**
   * Actualiza el idioma del servicio
   */
  setLanguage(language: 'es-ES' | 'ca-ES'): void {
    this.language = language;
    this.responseEngine.setLanguage(language);
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   */
  async processMessage(
    userMessage: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile['role'],
  ): Promise<AiResponse> {
    try {
      // Si el mensaje está vacío, mostrar menú principal
      if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        try {
          const t = this.getTranslationFunction();
          const menuResponse = generateMenuResponse(undefined, undefined, t);
          console.log('✅ [AiChatService] Menú principal generado:', menuResponse);
          return menuResponse;
        } catch (menuError) {
          console.error('❌ [AiChatService] Error generando menú principal:', menuError);
          // Fallback: retornar menú sin traducción
          return generateMenuResponse(undefined, undefined);
        }
      }

      // PRIORIDAD 1: Si es un comando de menú, procesarlo PRIMERO (antes de clasificar)
      const lowerMessage = userMessage.toLowerCase();
      if (
        lowerMessage.startsWith('menu:') ||
        lowerMessage.startsWith('how_to:') ||
        lowerMessage.startsWith('query:') ||
        lowerMessage.startsWith('info:')
      ) {
        console.log('🔍 [AiChatService] Detectado comando de menú:', userMessage);
        const menuResponse = await this.processMenuAction(
          userMessage,
          userPermissions || [],
          userRole,
        );
        // Si processMenuAction devolvió una respuesta válida, usarla directamente
        if (
          menuResponse &&
          menuResponse.content &&
          menuResponse.content !== 'PROCESS_DATA_QUERY'
        ) {
          console.log('✅ [AiChatService] Respuesta de menú generada:', menuResponse);
          return menuResponse;
        }
        console.warn(
          '⚠️ [AiChatService] processMenuAction no retornó respuesta válida, continuando con flujo normal',
        );
      }

      // PRIORIDAD 2: Clasificar la pregunta para mensajes normales
      const intent = await this.responseEngine.classifyQuestion(userMessage);
      console.log('🔍 [AiChatService] Intent clasificado:', intent);

      // Generar respuesta según la categoría
      let response = await this.responseEngine.generateResponse(
        userMessage,
        intent,
        userPermissions || [],
        userRole,
      );
      console.log('💬 [AiChatService] Respuesta generada:', response);

      // Si es una consulta de datos, procesarla
      if (response.content === 'PROCESS_DATA_QUERY') {
        try {
          response = await this.processDataQuery(userMessage, userPermissions || []);
        } catch (error) {
          console.error('Error procesando consulta de datos:', error);
          return {
            content:
              'Lo siento, hubo un error al consultar los datos. Por favor, inténtalo de nuevo.',
          };
        }
      }

      return response;
    } catch (error) {
      console.error('❌ [AiChatService] Error en processMessage:', error);
      console.error('❌ [AiChatService] Mensaje que causó el error:', userMessage);

      // Si el mensaje está vacío y hay un error, intentar retornar menú sin traducción
      if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        console.log(
          '🔄 [AiChatService] Intentando generar menú sin traducción como fallback...',
        );
        try {
          return generateMenuResponse(undefined, undefined);
        } catch (fallbackError) {
          console.error('❌ [AiChatService] Error en fallback:', fallbackError);
          // Último recurso: retornar menú básico
          return {
            content: '👋 ¡Hola! Soy MEYPAR IA. ¿En qué puedo ayudarte?',
            menuOptions: CHAT_MENU_STRUCTURE.map((opt) => ({
              id: opt.id,
              label: opt.label,
              emoji: opt.emoji,
              hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0,
            })),
          };
        }
      }

      return {
        content:
          'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo o reformula tu pregunta.',
      };
    }
  }

  /**
   * Procesa consultas de datos
   */
  private async processDataQuery(
    question: string,
    userPermissions: PermissionKey[],
  ): Promise<AiResponse> {
    try {
      const lowerQuestion = question.toLowerCase();

      // Verificar permisos para ver productos
      if (!userPermissions || !userPermissions.includes('products.view')) {
        return {
          content:
            "No tienes permisos para consultar información de productos. Necesitas el permiso 'products.view'.",
          requiresPermission: 'products.view',
        };
      }

      // Consultar productos en alarma
      if (
        lowerQuestion.includes('alarma') ||
        lowerQuestion.includes('stock bajo') ||
        lowerQuestion.includes('bajo stock') ||
        lowerQuestion.includes('en alarma')
      ) {
        try {
          const result = await this.productRepository.list(
            { lowStock: true },
            { page: 1, pageSize: 20 },
          );

          if (result.data.length === 0) {
            return {
              content:
                'No hay productos en alarma actualmente. Todos los productos tienen stock suficiente.',
            };
          }

          let content = `Encontré ${result.total} producto(s) en alarma de stock:<br /><br />`;
          result.data.slice(0, 10).forEach((product, index) => {
            content += `${index + 1}. <strong>${product.name}</strong> (${product.code})<br />`;
            content += `&nbsp;&nbsp;&nbsp;- Stock actual: ${product.stockCurrent}<br />`;
            content += `&nbsp;&nbsp;&nbsp;- Stock mínimo: ${product.stockMin}<br />`;
            content += `&nbsp;&nbsp;&nbsp;- Ubicación: ${product.aisle}, ${product.shelf}<br /><br />`;
          });

          if (result.total > 10) {
            content += `<br />... y ${result.total - 10} producto(s) más. Puedes ver todos en la página de Alarmas.`;
          }

          return {
            content,
            sources: ['/alerts'],
            suggestedActions: [
              {
                label: 'Ver todas las alarmas',
                path: '/alerts',
              },
            ],
          };
        } catch {
          return {
            content:
              'Lo siento, hubo un error al consultar los productos en alarma. Por favor, inténtalo de nuevo.',
          };
        }
      }

      // Consultar producto por código
      if (lowerQuestion.includes('código') || lowerQuestion.includes('codigo')) {
        // Intentar extraer el código del producto
        const codeMatch = question.match(/(?:código|codigo|code)\s+([A-Z0-9-]+)/i);
        if (codeMatch) {
          const code = codeMatch[1];
          try {
            const product = await this.productRepository.findByCodeOrBarcode(code);
            if (product) {
              return {
                content:
                  `<strong>${product.name}</strong> (${product.code})<br /><br />` +
                  `- Stock actual: ${product.stockCurrent} ${product.unitOfMeasure || 'unidades'}<br />` +
                  `- Stock mínimo: ${product.stockMin}<br />` +
                  `- Stock máximo: ${product.stockMax || 'Sin límite'}<br />` +
                  `- Ubicación: ${product.aisle}, ${product.shelf}${product.locationExtra ? `, ${product.locationExtra}` : ''}<br />` +
                  (product.description
                    ? `- Descripción: ${product.description}<br />`
                    : '') +
                  (product.category ? `- Categoría: ${product.category}<br />` : ''),
                sources: [`/products/${product.id}`],
                suggestedActions: [
                  {
                    label: 'Ver detalles del producto',
                    path: `/products/${product.id}`,
                  },
                ],
              };
            } else {
              return {
                content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`,
              };
            }
          } catch {
            return {
              content:
                'Lo siento, hubo un error al buscar el producto. Por favor, inténtalo de nuevo.',
            };
          }
        }
      }

      // Consultar movimientos o historial de un producto
      if (
        lowerQuestion.includes('movimiento') ||
        lowerQuestion.includes('historial') ||
        lowerQuestion.includes('quien movio') ||
        lowerQuestion.includes('movimientos de') ||
        lowerQuestion.includes('historial del')
      ) {
        // Intentar extraer el código del producto de la pregunta - múltiples patrones
        let code: string | null = null;

        // Patrón 1: "historial del producto CABLE-001" o "movimientos del producto TEST-003"
        const pattern1 = question.match(/(?:producto|producte)\s+([A-Z0-9-]+)/i);
        if (pattern1) {
          code = pattern1[1];
        }

        // Patrón 2: "código CABLE-001" o "codigo TEST-003"
        if (!code) {
          const pattern2 = question.match(/(?:código|codigo|code)\s+([A-Z0-9-]+)/i);
          if (pattern2) {
            code = pattern2[1];
          }
        }

        // Patrón 3: Buscar cualquier código al final de la pregunta (formato común: CABLE-001, TEST-003, etc.)
        if (!code) {
          const pattern3 = question.match(/\b([A-Z]{2,}[A-Z0-9-]{2,})\b/);
          if (pattern3 && pattern3[1].length >= 4) {
            code = pattern3[1];
          }
        }

        if (code) {
          try {
            const product = await this.productRepository.findByCodeOrBarcode(code);
            if (product) {
              // Obtener movimientos del producto
              const movements = await this.movementRepository.list(
                { productId: product.id },
                { page: 1, pageSize: 10 },
              );

              if (movements.data.length === 0) {
                return {
                  content: `El producto <strong>${product.name}</strong> (${product.code}) no tiene movimientos registrados aún.`,
                  sources: [`/products/${product.id}`, '/movements'],
                };
              }

              let content = `Movimientos recientes de <strong>${product.name}</strong> (${product.code}):<br /><br />`;
              movements.data.slice(0, 10).forEach((movement, index) => {
                const date = new Date(movement.createdAt).toLocaleDateString('es-ES');
                const typeMap: Record<string, string> = {
                  STOCK_IN: 'Entrada',
                  STOCK_OUT: 'Salida',
                  ADJUSTMENT: 'Ajuste',
                  TRANSFER: 'Transferencia',
                };
                content += `${index + 1}. ${typeMap[movement.movementType] || movement.movementType} - ${movement.quantity} unidades<br />`;
                content += `&nbsp;&nbsp;&nbsp;Fecha: ${date}<br />`;
                if (movement.requestReason) {
                  content += `&nbsp;&nbsp;&nbsp;Motivo: ${movement.requestReason}<br />`;
                }
                content += `<br />`;
              });

              if (movements.total > 10) {
                content += `<br />... y ${movements.total - 10} movimiento(s) más. Puedes ver todos en la página de Movimientos.`;
              }

              return {
                content,
                sources: [`/products/${product.id}`, '/movements'],
                suggestedActions: [
                  {
                    label: 'Ver todos los movimientos',
                    path: `/movements?product=${product.id}`,
                  },
                  {
                    label: 'Ver detalles del producto',
                    path: `/products/${product.id}`,
                  },
                ],
              };
            } else {
              return {
                content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`,
              };
            }
          } catch (error) {
            console.error('Error consultando movimientos:', error);
            return {
              content:
                'Lo siento, hubo un error al consultar los movimientos. Por favor, inténtalo de nuevo.',
            };
          }
        } else {
          return {
            content:
              'Para consultar movimientos de un producto, especifica el código. Por ejemplo: "¿Qué movimientos tiene el producto con código ABC-123?" o "Historial del producto TEST-001"',
            sources: ['/movements'],
          };
        }
      }

      // Consultar stock de un producto específico
      if (
        lowerQuestion.includes('stock') &&
        (lowerQuestion.includes('producto') || lowerQuestion.includes('tiene'))
      ) {
        const codeMatch = question.match(
          /(?:producto|código|codigo|code)\s+([A-Z0-9-]+)/i,
        );
        if (codeMatch) {
          const code = codeMatch[1];
          try {
            const product = await this.productRepository.findByCodeOrBarcode(code);
            if (product) {
              const status =
                product.stockCurrent <= product.stockMin ? 'en alarma' : 'normal';
              const statusColor =
                product.stockCurrent <= product.stockMin ? 'rojo' : 'verde';

              return {
                content:
                  `Información de stock de <strong>${product.name}</strong> (${product.code}):<br /><br />` +
                  `- Stock actual: <strong>${product.stockCurrent}</strong> ${product.unitOfMeasure || 'unidades'}<br />` +
                  `- Stock mínimo: ${product.stockMin}<br />` +
                  `- Stock máximo: ${product.stockMax || 'Sin límite'}<br />` +
                  `- Estado: <strong>${status}</strong> (${statusColor})<br />` +
                  (product.stockCurrent <= product.stockMin
                    ? `<br />⚠️ Este producto está en alarma. El stock actual es menor o igual al mínimo.`
                    : ''),
                sources: [`/products/${product.id}`],
                suggestedActions: [
                  {
                    label: 'Ver detalles del producto',
                    path: `/products/${product.id}`,
                  },
                ],
              };
            } else {
              return {
                content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`,
              };
            }
          } catch {
            return {
              content:
                'Lo siento, hubo un error al consultar el stock. Por favor, inténtalo de nuevo.',
            };
          }
        }
      }

      // Respuesta genérica para consultas de datos
      return {
        content:
          'Puedo ayudarte a consultar:<br /><br />' +
          '- Productos en alarma de stock<br />' +
          '- Información de un producto por código<br />' +
          '- Stock de un producto específico<br />' +
          '- Movimientos de un producto<br />' +
          '- Lista de productos<br /><br />' +
          '<strong>Ejemplos de preguntas:</strong><br />' +
          '- ¿Qué productos están en alarma?<br />' +
          '- ¿Cuál es el stock del producto con código ABC-123?<br />' +
          '- ¿Qué movimientos ha tenido el producto TEST-001?<br />' +
          '- Muestra productos con stock bajo',
      };
    } catch (error) {
      console.error('Error en processDataQuery:', error);
      return {
        content:
          'Lo siento, hubo un error al procesar tu consulta. Por favor, inténtalo de nuevo.',
      };
    }
  }

  /**
   * Procesa acciones de menú
   */
  private async processMenuAction(
    action: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile['role'],
  ): Promise<AiResponse> {
    const lowerAction = action.toLowerCase();

    // Buscar el menú por ID
    const findMenuById = (menus: MenuOption[], id: string): MenuOption | null => {
      for (const menu of menus) {
        if (menu.id === id) return menu;
        if (menu.subOptions) {
          const found = findMenuById(menu.subOptions, id);
          if (found) return found;
        }
      }
      return null;
    };

    // Si es menu:id, mostrar sub-opciones
    if (lowerAction.startsWith('menu:')) {
      const menuId = lowerAction.replace('menu:', '');
      const menu = findMenuById(CHAT_MENU_STRUCTURE, menuId);

      if (menu && menu.subOptions && menu.subOptions.length > 0) {
        const menuResponse = generateMenuResponse(menuId);
        return {
          ...menuResponse,
          menuOptions: menu.subOptions.map((opt) => ({
            id: opt.id,
            label: opt.label,
            emoji: opt.emoji,
            action: opt.action,
            path: opt.path,
            query: opt.query,
            hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0,
          })),
          menuId: menuId,
        };
      } else if (menu && !menu.subOptions) {
        // Si el menú no tiene sub-opciones pero tiene una acción, ejecutarla
        if (menu.action) {
          const intent = await this.responseEngine.classifyQuestion(menu.action);
          return await this.responseEngine.generateResponse(
            menu.action,
            intent,
            userPermissions || [],
            userRole,
          );
        } else if (menu.query) {
          // Si tiene query, procesarla como consulta de datos
          return await this.processDataQuery(menu.query, userPermissions || []);
        } else if (menu.path) {
          // Si tiene path, mostrar información sobre la página
          const t = this.getTranslationFunction();
          return {
            content: t('ai.chat.menu.pageInfo', { path: menu.path }),
            sources: [menu.path],
          };
        }
      }
    }

    // Si es info:page:, mostrar información sobre la página
    if (lowerAction.startsWith('info:page:')) {
      const path = lowerAction.replace('info:page:', '');
      return {
        content: `Puedes acceder a esta página navegando a <strong>${path}</strong> desde el menú lateral.<br /><br />Si necesitas ayuda específica sobre esta funcionalidad, pregunta y te guiaré.`,
        sources: [path],
      };
    }

    // Si es how_to:, query: o info:, procesar con ResponseEngine
    if (
      lowerAction.startsWith('how_to:') ||
      lowerAction.startsWith('query:') ||
      lowerAction.startsWith('info:')
    ) {
      const intent = await this.responseEngine.classifyQuestion(action);
      return await this.responseEngine.generateResponse(
        action,
        intent,
        userPermissions || [],
        userRole,
      );
    }

    // Por defecto, mostrar menú principal
    const t = this.getTranslationFunction();
    return generateMenuResponse(undefined, undefined, t);
  }

  /**
   * Obtiene la función de traducción según el idioma actual
   */
  private getTranslationFunction(): (
    key: string,
    params?: Record<string, string>,
  ) => string {
    // Importar las traducciones directamente
    const translations: Record<string, Record<string, string>> = {
      'es-ES': {
        'ai.chat.menu.products': 'Productos',
        'ai.chat.menu.products.create': 'Crear Producto',
        'ai.chat.menu.products.list': 'Ver Productos',
        'ai.chat.menu.products.stock': 'Consultar Stock',
        'ai.chat.menu.products.stock.alarm': 'Productos en Alarma',
        'ai.chat.menu.products.stock.byCode': 'Por Código',
        'ai.chat.menu.products.stock.low': 'Stock Bajo',
        'ai.chat.menu.products.filter': 'Filtrar Productos',
        'ai.chat.menu.products.export': 'Exportar',
        'ai.chat.menu.products.movements': 'Historial de Movimientos',
        'ai.chat.menu.movements': 'Movimientos',
        'ai.chat.menu.movements.list': 'Ver Movimientos',
        'ai.chat.menu.movements.createIn': 'Registrar Entrada',
        'ai.chat.menu.movements.createOut': 'Registrar Salida',
        'ai.chat.menu.movements.createTransfer': 'Crear Transferencia',
        'ai.chat.menu.movements.filter': 'Filtrar Movimientos',
        'ai.chat.menu.movements.export': 'Exportar',
        'ai.chat.menu.movements.byProduct': 'Por Producto',
        'ai.chat.menu.movements.history': 'Historial',
        'ai.chat.menu.batches': 'Lotes',
        'ai.chat.menu.batches.list': 'Ver Lotes',
        'ai.chat.menu.batches.create': 'Crear Lote',
        'ai.chat.menu.batches.expiring': 'Por Caducar',
        'ai.chat.menu.batches.expired': 'Caducados',
        'ai.chat.menu.batches.defective': 'Defectuosos',
        'ai.chat.menu.alerts': 'Alarmas',
        'ai.chat.menu.alerts.list': 'Ver Alarmas',
        'ai.chat.menu.alerts.stock': 'Stock Bajo',
        'ai.chat.menu.alerts.batches': 'Lotes Críticos',
        'ai.chat.menu.scanner': 'Escáner',
        'ai.chat.menu.scanner.use': 'Usar Escáner',
        'ai.chat.menu.scanner.usb': 'Escáner USB',
        'ai.chat.menu.scanner.camera': 'Cámara',
        'ai.chat.menu.dashboard': 'Dashboard',
        'ai.chat.menu.dashboard.view': 'Ver Dashboard',
        'ai.chat.menu.dashboard.kpis': 'KPIs',
        'ai.chat.menu.dashboard.charts': 'Gráficos',
        'ai.chat.menu.dashboard.activity': 'Actividad Reciente',
        'ai.chat.menu.settings': 'Configuración',
        'ai.chat.menu.settings.view': 'Ver Configuración',
        'ai.chat.menu.settings.language': 'Idioma',
        'ai.chat.menu.settings.theme': 'Tema',
        'ai.chat.menu.settings.profile': 'Perfil',
        'ai.chat.menu.admin': 'Administración',
        'ai.chat.menu.admin.view': 'Panel Admin',
        'ai.chat.menu.admin.users': 'Usuarios',
        'ai.chat.menu.admin.permissions': 'Permisos',
        'ai.chat.menu.reports': 'Reportes',
        'ai.chat.menu.reports.export': 'Exportar Datos',
        'ai.chat.menu.reports.excel': 'Exportar Excel',
        'ai.chat.menu.reports.csv': 'Exportar CSV',
        'ai.chat.menu.mainTitle': '👋 ¡Hola! Soy MEYPAR IA',
        'ai.chat.menu.mainQuestion': '¿En qué puedo ayudarte? Selecciona una opción:',
        'ai.chat.menu.mainDescription': 'Elige una categoría para comenzar:',
        'ai.chat.menu.subOptions': 'Opciones disponibles para {menu}:',
        'ai.chat.menu.notFound': 'No se encontró el menú solicitado',
        'ai.chat.menu.navigating': 'Navegando a {menu}...',
        'ai.chat.menu.pageInfo':
          'Puedes acceder a esta página navegando a <strong>{path}</strong> desde el menú lateral o haciendo clic en el botón correspondiente.<br /><br />Si necesitas ayuda específica sobre esta página, pregunta y te guiaré.',
      },
      'ca-ES': {
        'ai.chat.menu.products': 'Productes',
        'ai.chat.menu.products.create': 'Crear Producte',
        'ai.chat.menu.products.list': 'Veure Productes',
        'ai.chat.menu.products.stock': 'Consultar Stock',
        'ai.chat.menu.products.stock.alarm': 'Productes en Alarma',
        'ai.chat.menu.products.stock.byCode': 'Per Codi',
        'ai.chat.menu.products.stock.low': 'Stock Baix',
        'ai.chat.menu.products.filter': 'Filtrar Productes',
        'ai.chat.menu.products.export': 'Exportar',
        'ai.chat.menu.products.movements': 'Historial de Moviments',
        'ai.chat.menu.movements': 'Moviments',
        'ai.chat.menu.movements.list': 'Veure Moviments',
        'ai.chat.menu.movements.createIn': 'Registrar Entrada',
        'ai.chat.menu.movements.createOut': 'Registrar Sortida',
        'ai.chat.menu.movements.createTransfer': 'Crear Transferència',
        'ai.chat.menu.movements.filter': 'Filtrar Moviments',
        'ai.chat.menu.movements.export': 'Exportar',
        'ai.chat.menu.movements.byProduct': 'Per Producte',
        'ai.chat.menu.movements.history': 'Historial',
        'ai.chat.menu.batches': 'Lots',
        'ai.chat.menu.batches.list': 'Veure Lots',
        'ai.chat.menu.batches.create': 'Crear Lot',
        'ai.chat.menu.batches.expiring': 'Per Caducar',
        'ai.chat.menu.batches.expired': 'Caducats',
        'ai.chat.menu.batches.defective': 'Defectuosos',
        'ai.chat.menu.alerts': 'Alarmes',
        'ai.chat.menu.alerts.list': 'Veure Alarmes',
        'ai.chat.menu.alerts.stock': 'Stock Baix',
        'ai.chat.menu.alerts.batches': 'Lots Crítics',
        'ai.chat.menu.scanner': 'Escàner',
        'ai.chat.menu.scanner.use': 'Utilitzar Escàner',
        'ai.chat.menu.scanner.usb': 'Escàner USB',
        'ai.chat.menu.scanner.camera': 'Càmera',
        'ai.chat.menu.dashboard': 'Dashboard',
        'ai.chat.menu.dashboard.view': 'Veure Dashboard',
        'ai.chat.menu.dashboard.kpis': 'KPIs',
        'ai.chat.menu.dashboard.charts': 'Gràfics',
        'ai.chat.menu.dashboard.activity': 'Activitat Recent',
        'ai.chat.menu.settings': 'Configuració',
        'ai.chat.menu.settings.view': 'Veure Configuració',
        'ai.chat.menu.settings.language': 'Idioma',
        'ai.chat.menu.settings.theme': 'Tema',
        'ai.chat.menu.settings.profile': 'Perfil',
        'ai.chat.menu.admin': 'Administració',
        'ai.chat.menu.admin.view': 'Panel Admin',
        'ai.chat.menu.admin.users': 'Usuaris',
        'ai.chat.menu.admin.permissions': 'Permisos',
        'ai.chat.menu.reports': 'Informes',
        'ai.chat.menu.reports.export': 'Exportar Dades',
        'ai.chat.menu.reports.excel': 'Exportar Excel',
        'ai.chat.menu.reports.csv': 'Exportar CSV',
        'ai.chat.menu.mainTitle': '👋 Hola! Sóc MEYPAR IA',
        'ai.chat.menu.mainQuestion': 'En què et puc ajudar? Selecciona una opció:',
        'ai.chat.menu.mainDescription': 'Tria una categoria per començar:',
        'ai.chat.menu.subOptions': 'Opcions disponibles per {menu}:',
        'ai.chat.menu.notFound': "No s'ha trobat el menú sol·licitat",
        'ai.chat.menu.navigating': 'Navegant a {menu}...',
        'ai.chat.menu.pageInfo':
          'Pots accedir a aquesta pàgina navegant a <strong>{path}</strong> des del menú lateral o fent clic al botó corresponent.<br /><br />Si necessites ajuda específica sobre aquesta pàgina, pregunta i et guiaré.',
      },
    };

    const langTranslations = translations[this.language] || translations['es-ES'];

    return (key: string, params?: Record<string, string>) => {
      let translation = langTranslations[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          translation = translation.replace(`{${paramKey}}`, paramValue);
        });
      }
      return translation;
    };
  }

  /**
   * Invalida el cache del analizador de código
   */
  invalidateCache(): void {
    this.codeAnalyzer.invalidateCache();
  }
}
