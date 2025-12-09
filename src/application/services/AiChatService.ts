import type { PermissionKey, UserProfile } from "@domain/entities";
import type { ProductRepository } from "@domain/repositories/ProductRepository";
import type { InventoryMovementRepository } from "@domain/repositories/InventoryMovementRepository";
import type { AiResponse } from "@infrastructure/ai/types";
import { ResponseEngine } from "@infrastructure/ai/ResponseEngine";
import { CodeAnalyzer } from "@infrastructure/ai/CodeAnalyzer";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryMovementRepository } from "@infrastructure/repositories/SupabaseInventoryMovementRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { CHAT_MENU_STRUCTURE, generateMenuResponse, type MenuOption } from "@infrastructure/ai/ChatMenuStructure";

/**
 * Servicio que procesa mensajes del chat de IA
 */
export class AiChatService {
  private responseEngine: ResponseEngine;
  private codeAnalyzer: CodeAnalyzer;
  private productRepository: ProductRepository;
  private movementRepository: InventoryMovementRepository;

  constructor(
    productRepository?: ProductRepository,
    movementRepository?: InventoryMovementRepository
  ) {
    this.responseEngine = new ResponseEngine();
    this.codeAnalyzer = CodeAnalyzer.getInstance();
    this.productRepository = productRepository || new SupabaseProductRepository(supabaseClient);
    this.movementRepository = movementRepository || new SupabaseInventoryMovementRepository(supabaseClient);
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   */
  async processMessage(
    userMessage: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile["role"]
  ): Promise<AiResponse> {
    try {
      // Si el mensaje está vacío, mostrar menú principal
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        const menuResponse = generateMenuResponse();
        return {
          ...menuResponse,
          menuOptions: CHAT_MENU_STRUCTURE.map((opt) => ({
            id: opt.id,
            label: opt.label,
            emoji: opt.emoji,
            hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0
          }))
        };
      }

      // Clasificar la pregunta
      const intent = await this.responseEngine.classifyQuestion(userMessage);
      console.log("🔍 Intent clasificado:", intent);

      // Generar respuesta según la categoría
      let response = await this.responseEngine.generateResponse(
        userMessage,
        intent,
        userPermissions || [],
        userRole
      );
      console.log("💬 Respuesta generada:", response);

      // Si es una consulta de datos, procesarla
      if (response.content === "PROCESS_DATA_QUERY") {
        try {
          response = await this.processDataQuery(userMessage, userPermissions || []);
        } catch (error) {
          console.error("Error procesando consulta de datos:", error);
          return {
            content: "Lo siento, hubo un error al consultar los datos. Por favor, inténtalo de nuevo."
          };
        }
      }

      // Si es un comando de menú, procesarlo ANTES de la clasificación normal
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.startsWith("menu:") || lowerMessage.startsWith("how_to:") || lowerMessage.startsWith("query:") || lowerMessage.startsWith("info:")) {
        response = await this.processMenuAction(userMessage, userPermissions || [], userRole);
        // Si processMenuAction devolvió una respuesta válida, usarla directamente
        if (response && response.content && response.content !== "PROCESS_DATA_QUERY") {
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error("Error en processMessage:", error);
      return {
        content: "Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo o reformula tu pregunta."
      };
    }
  }

  /**
   * Procesa consultas de datos
   */
  private async processDataQuery(
    question: string,
    userPermissions: PermissionKey[]
  ): Promise<AiResponse> {
    try {
      const lowerQuestion = question.toLowerCase();

      // Verificar permisos para ver productos
      if (!userPermissions || !userPermissions.includes("products.view")) {
        return {
          content: "No tienes permisos para consultar información de productos. Necesitas el permiso 'products.view'.",
          requiresPermission: "products.view"
        };
      }

    // Consultar productos en alarma
    if (
      lowerQuestion.includes("alarma") ||
      lowerQuestion.includes("stock bajo") ||
      lowerQuestion.includes("bajo stock") ||
      lowerQuestion.includes("en alarma")
    ) {
      try {
        const result = await this.productRepository.list(
          { lowStock: true },
          { page: 1, pageSize: 20 }
        );

        if (result.data.length === 0) {
          return {
            content: "No hay productos en alarma actualmente. Todos los productos tienen stock suficiente."
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
          sources: ["/alerts"],
          suggestedActions: [
            {
              label: "Ver todas las alarmas",
              path: "/alerts"
            }
          ]
        };
      } catch {
        return {
          content: "Lo siento, hubo un error al consultar los productos en alarma. Por favor, inténtalo de nuevo."
        };
      }
    }

    // Consultar producto por código
    if (lowerQuestion.includes("código") || lowerQuestion.includes("codigo")) {
      // Intentar extraer el código del producto
      const codeMatch = question.match(/(?:código|codigo|code)\s+([A-Z0-9-]+)/i);
      if (codeMatch) {
        const code = codeMatch[1];
        try {
          const product = await this.productRepository.findByCodeOrBarcode(code);
          if (product) {
            return {
              content: `<strong>${product.name}</strong> (${product.code})<br /><br />` +
                `- Stock actual: ${product.stockCurrent} ${product.unitOfMeasure || "unidades"}<br />` +
                `- Stock mínimo: ${product.stockMin}<br />` +
                `- Stock máximo: ${product.stockMax || "Sin límite"}<br />` +
                `- Ubicación: ${product.aisle}, ${product.shelf}${product.locationExtra ? `, ${product.locationExtra}` : ""}<br />` +
                (product.description ? `- Descripción: ${product.description}<br />` : "") +
                (product.category ? `- Categoría: ${product.category}<br />` : ""),
              sources: [`/products/${product.id}`],
              suggestedActions: [
                {
                  label: "Ver detalles del producto",
                  path: `/products/${product.id}`
                }
              ]
            };
          } else {
            return {
              content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`
            };
          }
        } catch {
          return {
            content: "Lo siento, hubo un error al buscar el producto. Por favor, inténtalo de nuevo."
          };
        }
      }
    }

    // Consultar movimientos o historial de un producto
    if (lowerQuestion.includes("movimiento") || lowerQuestion.includes("historial") || lowerQuestion.includes("quien movio") || lowerQuestion.includes("movimientos de") || lowerQuestion.includes("historial del")) {
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
              { page: 1, pageSize: 10 }
            );
            
            if (movements.data.length === 0) {
              return {
                content: `El producto <strong>${product.name}</strong> (${product.code}) no tiene movimientos registrados aún.`,
                sources: [`/products/${product.id}`, "/movements"]
              };
            }

            let content = `Movimientos recientes de <strong>${product.name}</strong> (${product.code}):<br /><br />`;
            movements.data.slice(0, 10).forEach((movement, index) => {
              const date = new Date(movement.createdAt).toLocaleDateString("es-ES");
              const typeMap: Record<string, string> = {
                "STOCK_IN": "Entrada",
                "STOCK_OUT": "Salida",
                "ADJUSTMENT": "Ajuste",
                "TRANSFER": "Transferencia"
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
              sources: [`/products/${product.id}`, "/movements"],
              suggestedActions: [
                {
                  label: "Ver todos los movimientos",
                  path: `/movements?product=${product.id}`
                },
                {
                  label: "Ver detalles del producto",
                  path: `/products/${product.id}`
                }
              ]
            };
          } else {
            return {
              content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`
            };
          }
        } catch (error) {
          console.error("Error consultando movimientos:", error);
          return {
            content: "Lo siento, hubo un error al consultar los movimientos. Por favor, inténtalo de nuevo."
          };
        }
      } else {
        return {
          content: "Para consultar movimientos de un producto, especifica el código. Por ejemplo: \"¿Qué movimientos tiene el producto con código ABC-123?\" o \"Historial del producto TEST-001\"",
          sources: ["/movements"]
        };
      }
    }

    // Consultar stock de un producto específico
    if (lowerQuestion.includes("stock") && (lowerQuestion.includes("producto") || lowerQuestion.includes("tiene"))) {
      const codeMatch = question.match(/(?:producto|código|codigo|code)\s+([A-Z0-9-]+)/i);
      if (codeMatch) {
        const code = codeMatch[1];
        try {
          const product = await this.productRepository.findByCodeOrBarcode(code);
          if (product) {
            const status = product.stockCurrent <= product.stockMin ? "en alarma" : "normal";
            const statusColor = product.stockCurrent <= product.stockMin ? "rojo" : "verde";
            
            return {
              content: `Información de stock de <strong>${product.name}</strong> (${product.code}):<br /><br />` +
                `- Stock actual: <strong>${product.stockCurrent}</strong> ${product.unitOfMeasure || "unidades"}<br />` +
                `- Stock mínimo: ${product.stockMin}<br />` +
                `- Stock máximo: ${product.stockMax || "Sin límite"}<br />` +
                `- Estado: <strong>${status}</strong> (${statusColor})<br />` +
                (product.stockCurrent <= product.stockMin 
                  ? `<br />⚠️ Este producto está en alarma. El stock actual es menor o igual al mínimo.`
                  : ""),
              sources: [`/products/${product.id}`],
              suggestedActions: [
                {
                  label: "Ver detalles del producto",
                  path: `/products/${product.id}`
                }
              ]
            };
          } else {
            return {
              content: `No se encontró ningún producto con el código "${code}". Verifica que el código sea correcto.`
            };
          }
        } catch {
          return {
            content: "Lo siento, hubo un error al consultar el stock. Por favor, inténtalo de nuevo."
          };
        }
      }
    }

      // Respuesta genérica para consultas de datos
      return {
        content: "Puedo ayudarte a consultar:<br /><br />" +
          "- Productos en alarma de stock<br />" +
          "- Información de un producto por código<br />" +
          "- Stock de un producto específico<br />" +
          "- Movimientos de un producto<br />" +
          "- Lista de productos<br /><br />" +
          "<strong>Ejemplos de preguntas:</strong><br />" +
          "- ¿Qué productos están en alarma?<br />" +
          "- ¿Cuál es el stock del producto con código ABC-123?<br />" +
          "- ¿Qué movimientos ha tenido el producto TEST-001?<br />" +
          "- Muestra productos con stock bajo"
      };
    } catch (error) {
      console.error("Error en processDataQuery:", error);
      return {
        content: "Lo siento, hubo un error al procesar tu consulta. Por favor, inténtalo de nuevo."
      };
    }
  }

  /**
   * Procesa acciones de menú
   */
  private async processMenuAction(
    action: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile["role"]
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
    if (lowerAction.startsWith("menu:")) {
      const menuId = lowerAction.replace("menu:", "");
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
            hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0
          })),
          menuId: menuId
        };
      } else if (menu && !menu.subOptions) {
        // Si el menú no tiene sub-opciones pero tiene una acción, ejecutarla
        if (menu.action) {
          const intent = await this.responseEngine.classifyQuestion(menu.action);
          return await this.responseEngine.generateResponse(
            menu.action,
            intent,
            userPermissions || [],
            userRole
          );
        } else if (menu.query) {
          // Si tiene query, procesarla como consulta de datos
          return await this.processDataQuery(menu.query, userPermissions || []);
        } else if (menu.path) {
          // Si tiene path, mostrar información sobre la página
          return {
            content: `Puedes acceder a esta página navegando a <strong>${menu.path}</strong> desde el menú lateral o haciendo clic en el botón correspondiente.<br /><br />Si necesitas ayuda específica sobre esta página, pregunta y te guiaré.`,
            sources: [menu.path]
          };
        }
      }
    }

    // Si es info:page:, mostrar información sobre la página
    if (lowerAction.startsWith("info:page:")) {
      const path = lowerAction.replace("info:page:", "");
      return {
        content: `Puedes acceder a esta página navegando a <strong>${path}</strong> desde el menú lateral.<br /><br />Si necesitas ayuda específica sobre esta funcionalidad, pregunta y te guiaré.`,
        sources: [path]
      };
    }

    // Si es how_to:, query: o info:, procesar con ResponseEngine
    if (lowerAction.startsWith("how_to:") || lowerAction.startsWith("query:") || lowerAction.startsWith("info:")) {
      const intent = await this.responseEngine.classifyQuestion(action);
      return await this.responseEngine.generateResponse(
        action,
        intent,
        userPermissions || [],
        userRole
      );
    }

    // Por defecto, mostrar menú principal
    const menuResponse = generateMenuResponse();
    return {
      ...menuResponse,
      menuOptions: CHAT_MENU_STRUCTURE.map((opt) => ({
        id: opt.id,
        label: opt.label,
        emoji: opt.emoji,
        hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0
      }))
    };
  }

  /**
   * Invalida el cache del analizador de código
   */
  invalidateCache(): void {
    this.codeAnalyzer.invalidateCache();
  }
}

