import type { PermissionKey, UserProfile } from "@domain/entities";
import type { ProductRepository } from "@domain/repositories/ProductRepository";
import type { InventoryMovementRepository } from "@domain/repositories/InventoryMovementRepository";
import type { AiResponse } from "@infrastructure/ai/types";
import { ResponseEngine } from "@infrastructure/ai/ResponseEngine";
import { CodeAnalyzer } from "@infrastructure/ai/CodeAnalyzer";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryMovementRepository } from "@infrastructure/repositories/SupabaseInventoryMovementRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

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
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return {
          content: "Por favor, escribe una pregunta válida."
        };
      }

      // Clasificar la pregunta
      const intent = await this.responseEngine.classifyQuestion(userMessage);

      // Generar respuesta según la categoría
      let response = await this.responseEngine.generateResponse(
        userMessage,
        intent,
        userPermissions || [],
        userRole
      );

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

        let content = `Encontré ${result.total} producto(s) en alarma de stock:\n\n`;
        result.data.slice(0, 10).forEach((product, index) => {
          content += `${index + 1}. **${product.name}** (${product.code})\n`;
          content += `   - Stock actual: ${product.stockCurrent}\n`;
          content += `   - Stock mínimo: ${product.stockMin}\n`;
          content += `   - Ubicación: ${product.aisle}, ${product.shelf}\n\n`;
        });

        if (result.total > 10) {
          content += `\n... y ${result.total - 10} producto(s) más. Puedes ver todos en la página de Alarmas.`;
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
      } catch (error) {
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
              content: `**${product.name}** (${product.code})\n\n` +
                `- Stock actual: ${product.stockCurrent} ${product.unitOfMeasure || "unidades"}\n` +
                `- Stock mínimo: ${product.stockMin}\n` +
                `- Ubicación: ${product.aisle}, ${product.shelf}\n` +
                (product.description ? `- Descripción: ${product.description}\n` : ""),
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
        } catch (error) {
          return {
            content: "Lo siento, hubo un error al buscar el producto. Por favor, inténtalo de nuevo."
          };
        }
      }
    }

    // Consultar movimientos o historial
    if (lowerQuestion.includes("movimiento") || lowerQuestion.includes("historial") || lowerQuestion.includes("quien movio")) {
      return {
        content: "Para ver los movimientos, puedes ir a la página de Movimientos. Pronto podré buscar movimientos específicos por aquí.",
        sources: ["/movements"],
        suggestedActions: [
          {
            label: "Ir a Movimientos",
            path: "/movements"
          }
        ]
      };
    }

      // Respuesta genérica para consultas de datos
      return {
        content: "Puedo ayudarte a consultar:\n\n" +
          "- Productos en alarma de stock\n" +
          "- Información de un producto por código\n" +
          "- Lista de productos\n\n" +
          "Ejemplos de preguntas:\n" +
          "- ¿Qué productos están en alarma?\n" +
          "- ¿Cuál es el stock del producto con código ABC-123?\n" +
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
   * Invalida el cache del analizador de código
   */
  invalidateCache(): void {
    this.codeAnalyzer.invalidateCache();
  }
}

