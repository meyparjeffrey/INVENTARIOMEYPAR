import type { PermissionKey, UserProfile } from "@domain/entities";
import type { ProductRepository } from "@domain/repositories/ProductRepository";
import type { InventoryMovementRepository } from "@domain/repositories/InventoryMovementRepository";
import type { AiResponse } from "@infrastructure/ai/types";
import { ResponseEngine } from "@infrastructure/ai/ResponseEngine";
import { CodeAnalyzer } from "@infrastructure/ai/CodeAnalyzer";
import { SupabaseProductRepository } from "@infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryMovementRepository } from "@infrastructure/repositories/SupabaseInventoryMovementRepository";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { getAiResponse } from "@infrastructure/ai/responseTranslations";
import { nlg } from "@infrastructure/ai/NaturalLanguageGenerator";
import type { IAiService } from "./interfaces/IAiService";

type LanguageCode = "es-ES" | "ca-ES";

/**
 * Servicio que procesa mensajes del chat de IA (sistema local)
 * Consulta directamente las tablas de Supabase para datos siempre actualizados
 * Implementa IAiService para permitir intercambio con otros sistemas (Gemini)
 */
export class AiChatService implements IAiService {
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
    userRole?: UserProfile["role"],
    language: LanguageCode = "es-ES"
  ): Promise<AiResponse> {
    try {
      if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return {
          content: getAiResponse(language, "error.invalidQuestion")
        };
      }

      // Clasificar la pregunta
      const intent = await this.responseEngine.classifyQuestion(userMessage, language);

      // Generar respuesta según la categoría
      let response = await this.responseEngine.generateResponse(
        userMessage,
        intent,
        userPermissions || [],
        userRole,
        language
      );

      // Si es una consulta de datos, procesarla
      if (response.content === "PROCESS_DATA_QUERY") {
        try {
          response = await this.processDataQuery(userMessage, userPermissions || [], language);
        } catch (error) {
          console.error("Error procesando consulta de datos:", error);
          return {
            content: getAiResponse(language, "error.dataQuery")
          };
        }
      }

      return response;
    } catch (error) {
      console.error("Error en processMessage:", error);
      return {
        content: getAiResponse(language, "error.generic")
      };
    }
  }

  /**
   * Procesa consultas de datos
   */
  private async processDataQuery(
    question: string,
    userPermissions: PermissionKey[],
    language: LanguageCode = "es-ES"
  ): Promise<AiResponse> {
    try {
      const lowerQuestion = question.toLowerCase();

      // Verificar permisos para ver productos
      if (!userPermissions || !userPermissions.includes("products.view")) {
        return {
          content: getAiResponse(language, "error.noPermission"),
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
            content: getAiResponse(language, "dataQuery.noAlarms")
          };
        }

        let content = getAiResponse(language, "dataQuery.alarmsFound", { count: result.total });
        result.data.slice(0, 10).forEach((product, index) => {
          content += `${index + 1}. **${product.name}** (${product.code})\n`;
          content += `   - Stock actual: ${product.stockCurrent}\n`;
          content += `   - Stock mínimo: ${product.stockMin}\n`;
          content += `   - Ubicación: ${product.aisle}, ${product.shelf}\n\n`;
        });

        if (result.total > 10) {
          content += getAiResponse(language, "dataQuery.moreAlarms", { count: result.total - 10 });
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

    // Consultar producto por código, nombre o descripción
    // Buscar patrones como "producto con código X", "información del producto Y", etc.
    const productSearchPatterns = [
      // Código específico: "código ABC-123", "code XYZ", etc.
      /(?:código|codigo|code)\s+([A-Z0-9-_]+)/i,
      // Nombre o descripción: "producto llamado X", "información de X", "el producto X", etc.
      /(?:producto|producte|product|información|informacio|info|dades|datos)\s+(?:con|de|llamado|llamat|denominado|denominat|que se llama|que es|es|nombrado)\s+([A-Za-z0-9\s-]+?)(?:\s|$|\.|\?)/i,
      // Directo: entre comillas o después de "dame info de" / "busca"
      /(?:dame|dona|busca|buscar|cercar|muestra|mostrar|información|informacio|info|dades|datos|sobre|de)\s+(?:el|la|un|una|del|de la)\s+(?:producto|producte|product)\s+([A-Za-z0-9\s-]+?)(?:\s|$|\.|\?)/i,
      // Después de "cuál es", "qué es", etc.
      /(?:cuál|qual|qué|que|què)\s+(?:es|és)\s+(?:el|la)\s+(?:producto|producte|product)\s+([A-Za-z0-9\s-]+?)(?:\s|$|\.|\?)/i
    ];
    
    let searchTerm: string | null = null;
    let searchType: "code" | "name" | "description" = "code";
    
    // Intentar extraer término de búsqueda de diferentes patrones
    for (const pattern of productSearchPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        searchTerm = match[1].trim();
        // Si parece un código (letras/números con guiones, sin espacios)
        if (/^[A-Z0-9-_]+$/i.test(searchTerm)) {
          searchType = "code";
        } else {
          // Si tiene espacios o letras, es probablemente nombre o descripción
          searchType = "name";
        }
        break;
      }
    }
    
    // Si no encontramos patrón, intentar buscar palabras clave de producto en la pregunta
    if (!searchTerm && (lowerQuestion.includes("producto") || lowerQuestion.includes("producte"))) {
      // Buscar el término más probable (palabras después de "producto")
      const words = question.split(/\s+/);
      const productIndex = words.findIndex(w => 
        /producto|producte|product/i.test(w)
      );
      if (productIndex >= 0 && productIndex < words.length - 1) {
        // Tomar las siguientes 2-4 palabras como término de búsqueda
        searchTerm = words.slice(productIndex + 1, productIndex + 5).join(" ").replace(/[.?,;:!]/g, "").trim();
        if (searchTerm) {
          searchType = "name";
        }
      }
    }
    
    if (searchTerm) {
      try {
        let product = null;
        
        // Primero intentar por código si parece un código
        if (searchType === "code") {
          product = await this.productRepository.findByCodeOrBarcode(searchTerm);
        }
        
        // Si no se encontró por código, buscar por nombre/descripción
        if (!product && searchType === "name") {
          const result = await this.productRepository.list(
            { search: searchTerm },
            { page: 1, pageSize: 5 }
          );
          
          if (result.data.length > 0) {
            // Si hay múltiples resultados, tomar el primero (más relevante)
            product = result.data[0];
            
            // Si hay más resultados, mencionarlo en la respuesta
            if (result.data.length > 1) {
              // Podríamos mostrar los otros resultados también
            }
          }
        }
        
        if (product) {
          // Construir respuesta detallada usando NLG
          const baseContent = language === "ca-ES"
            ? `Trobat! Aquí tens la informació del producte **${product.name}** (${product.code}):\n\n`
            : `¡Encontrado! Aquí tienes la información del producto **${product.name}** (${product.code}):\n\n`;
          
          let content = baseContent;
          content += language === "ca-ES"
            ? `📦 **Stock**:\n`
            : `📦 **Stock**:\n`;
          content += `   - ${language === "ca-ES" ? "Actual" : "Actual"}: ${product.stockCurrent} ${product.unitOfMeasure || (language === "ca-ES" ? "unitats" : "unidades")}\n`;
          content += `   - ${language === "ca-ES" ? "Mínim" : "Mínimo"}: ${product.stockMin}\n`;
          
          if (product.stockMax) {
            content += `   - ${language === "ca-ES" ? "Màxim" : "Máximo"}: ${product.stockMax}\n`;
          }
          
          content += `\n📍 **${language === "ca-ES" ? "Ubicació" : "Ubicación"}**: ${product.aisle}, ${product.shelf}\n`;
          
          if (product.description) {
            content += `\n📝 **${language === "ca-ES" ? "Descripció" : "Descripción"}**: ${product.description}\n`;
          }
          
          if (product.category) {
            content += `\n🏷️ **${language === "ca-ES" ? "Categoria" : "Categoría"}**: ${product.category}\n`;
          }
          
          if (product.costPrice) {
            content += `\n💰 **${language === "ca-ES" ? "Preu de cost" : "Precio de coste"}**: ${product.costPrice.toFixed(2)}€\n`;
          }
          
          if (product.salePrice) {
            content += `   - **${language === "ca-ES" ? "Preu de venda" : "Precio de venta"}**: ${product.salePrice.toFixed(2)}€\n`;
          }
          
          // Estado de stock
          if (product.stockCurrent <= product.stockMin) {
            content += `\n⚠️ ${language === "ca-ES" ? "**Alerta**: Stock baix! El producte està per sota del mínim." : "**Alerta**: ¡Stock bajo! El producto está por debajo del mínimo."}\n`;
          }
          
          // Consultar movimientos recientes del producto (últimos 5)
          try {
            const movementsResult = await this.movementRepository.list(
              { productId: product.id },
              { page: 1, pageSize: 5 }
            );
            
            if (movementsResult.data.length > 0) {
              content += `\n📊 **${language === "ca-ES" ? "Moviments recents" : "Movimientos recientes"}**:\n`;
              movementsResult.data.slice(0, 5).forEach((movement, idx) => {
                const movementType = movement.movementType === "IN" 
                  ? (language === "ca-ES" ? "Entrada" : "Entrada")
                  : movement.movementType === "OUT"
                  ? (language === "ca-ES" ? "Sortida" : "Salida")
                  : movement.movementType;
                
                const date = new Date(movement.movementDate).toLocaleDateString(
                  language === "ca-ES" ? "ca-ES" : "es-ES"
                );
                
                content += `   ${idx + 1}. ${movementType}: ${movement.quantity} ${language === "ca-ES" ? "unitats" : "unidades"} (${date})\n`;
                if (movement.requestReason) {
                  content += `      ${language === "ca-ES" ? "Motiu" : "Motivo"}: ${movement.requestReason}\n`;
                }
              });
              
              if (movementsResult.total > 5) {
                content += `\n   ${language === "ca-ES" ? "... i" : "... y"} ${movementsResult.total - 5} ${language === "ca-ES" ? "moviments més" : "movimientos más"}. ${language === "ca-ES" ? "Veure tots" : "Ver todos"} en ${language === "ca-ES" ? "moviments" : "movimientos"}\n`;
              }
            }
          } catch (movError) {
            console.error("Error consultando movimientos:", movError);
            // Continuar sin mostrar movimientos si hay error
          }
          
          // Aplicar NLG para hacer la respuesta más humana
          const finalContent = nlg.generateResponse(content, language, {
            variation: "friendly",
            addPersonalTouch: true
          });
          
          return {
            content: finalContent,
            sources: [`/products/${product.id}`],
            suggestedActions: [
              {
                label: language === "ca-ES" ? "Veure detalls del producte" : "Ver detalles del producto",
                path: `/products/${product.id}`
              },
              {
                label: language === "ca-ES" ? "Veure tots els moviments" : "Ver todos los movimientos",
                path: `/movements?productId=${product.id}`
              }
            ]
          };
        } else {
          return {
            content: getAiResponse(language, "dataQuery.productNotFound", { code: searchTerm })
          };
        }
      } catch (error) {
        console.error("Error buscando producto:", error);
        return {
          content: getAiResponse(language, "error.dataQuery")
        };
      }
    }

    // Consultar movimientos de un producto específico
    const movementKeywords = {
      "es-ES": ["movimientos", "movimiento", "historial", "entradas", "salidas"],
      "ca-ES": ["moviments", "moviment", "historial", "entrades", "sortides"]
    };
    
    const hasMovementQuery = movementKeywords[language].some(keyword => 
      lowerQuestion.includes(keyword)
    );
    
    if (hasMovementQuery && (lowerQuestion.includes("producto") || lowerQuestion.includes("producte"))) {
      // Intentar extraer el código o nombre del producto
      const productCodeMatch = question.match(/(?:producto|producte)\s+(?:con|de|llamado|llamat)\s+([A-Z0-9-]+)/i);
      const productNameMatch = question.match(/(?:producto|producte)\s+([A-Za-z0-9\s-]+?)(?:\s|$|\.|\?)/i);
      
      let productToSearch = null;
      if (productCodeMatch && productCodeMatch[1]) {
        productToSearch = await this.productRepository.findByCodeOrBarcode(productCodeMatch[1]);
      } else if (productNameMatch && productNameMatch[1]) {
        const searchResult = await this.productRepository.list(
          { search: productNameMatch[1].trim() },
          { page: 1, pageSize: 1 }
        );
        if (searchResult.data.length > 0) {
          productToSearch = searchResult.data[0];
        }
      }
      
      if (productToSearch) {
        try {
          const movementsResult = await this.movementRepository.list(
            { productId: productToSearch.id },
            { page: 1, pageSize: 10 }
          );
          
          if (movementsResult.data.length === 0) {
            const noMovementsMsg = language === "ca-ES"
              ? `No s'han trobat moviments per al producte **${productToSearch.name}** (${productToSearch.code}).`
              : `No se han encontrado movimientos para el producto **${productToSearch.name}** (${productToSearch.code}).`;
            
            return {
              content: nlg.generateResponse(noMovementsMsg, language, { variation: "friendly" })
            };
          }
          
          let movementsContent = language === "ca-ES"
            ? `Moviments del producte **${productToSearch.name}** (${productToSearch.code}):\n\n`
            : `Movimientos del producto **${productToSearch.name}** (${productToSearch.code}):\n\n`;
          
          movementsResult.data.forEach((movement, idx) => {
            const movementType = movement.movementType === "IN"
              ? (language === "ca-ES" ? "✅ Entrada" : "✅ Entrada")
              : movement.movementType === "OUT"
              ? (language === "ca-ES" ? "📤 Sortida" : "📤 Salida")
              : movement.movementType;
            
            const date = new Date(movement.movementDate).toLocaleDateString(
              language === "ca-ES" ? "ca-ES" : "es-ES"
            );
            
            movementsContent += `${idx + 1}. ${movementType}: ${movement.quantity} ${language === "ca-ES" ? "unitats" : "unidades"}\n`;
            movementsContent += `   📅 ${date}\n`;
            movementsContent += `   📊 ${language === "ca-ES" ? "Stock" : "Stock"}: ${movement.quantityBefore} → ${movement.quantityAfter}\n`;
            if (movement.requestReason) {
              movementsContent += `   💬 ${language === "ca-ES" ? "Motiu" : "Motivo"}: ${movement.requestReason}\n`;
            }
            movementsContent += `\n`;
          });
          
          if (movementsResult.total > 10) {
            movementsContent += `${language === "ca-ES" ? "... i" : "... y"} ${movementsResult.total - 10} ${language === "ca-ES" ? "moviments més" : "movimientos más"}.\n`;
          }
          
          const finalMovementsContent = nlg.generateResponse(movementsContent, language, {
            variation: "detailed",
            addPersonalTouch: true
          });
          
          return {
            content: finalMovementsContent,
            sources: [`/movements?productId=${productToSearch.id}`],
            suggestedActions: [
              {
                label: language === "ca-ES" ? "Veure tots els moviments" : "Ver todos los movimientos",
                path: `/movements?productId=${productToSearch.id}`
              }
            ]
          };
        } catch (error) {
          console.error("Error consultando movimientos:", error);
          return {
            content: getAiResponse(language, "error.dataQuery")
          };
        }
      }
    }

    // Consulta de stock detallado
    const stockKeywords = {
      "es-ES": ["stock", "cantidad", "unidades", "inventario"],
      "ca-ES": ["estoc", "quantitat", "unitats", "inventari"]
    };
    
    const hasStockQuery = stockKeywords[language].some(keyword => 
      lowerQuestion.includes(keyword)
    ) && (lowerQuestion.includes("producto") || lowerQuestion.includes("producte"));
    
    if (hasStockQuery) {
      // Intentar buscar producto
      const stockProductMatch = question.match(/(?:producto|producte)\s+(?:con|de|llamado|llamat)\s+([A-Z0-9-]+)/i) ||
                                 question.match(/(?:producto|producte)\s+([A-Za-z0-9\s-]+?)(?:\s|$|\.|\?)/i);
      
      if (stockProductMatch && stockProductMatch[1]) {
        let stockProduct = await this.productRepository.findByCodeOrBarcode(stockProductMatch[1].trim());
        
        if (!stockProduct) {
          const searchResult = await this.productRepository.list(
            { search: stockProductMatch[1].trim() },
            { page: 1, pageSize: 1 }
          );
          if (searchResult.data.length > 0) {
            stockProduct = searchResult.data[0];
          }
        }
        
        if (stockProduct) {
          const stockContent = language === "ca-ES"
            ? `Informació d'estoc del producte **${stockProduct.name}** (${stockProduct.code}):\n\n`
            : `Información de stock del producto **${stockProduct.name}** (${stockProduct.code}):\n\n`;
          
          let stockInfo = stockContent;
          stockInfo += `📦 ${language === "ca-ES" ? "Stock actual" : "Stock actual"}: **${stockProduct.stockCurrent}** ${stockProduct.unitOfMeasure || (language === "ca-ES" ? "unitats" : "unidades")}\n`;
          stockInfo += `📉 ${language === "ca-ES" ? "Stock mínim" : "Stock mínimo"}: ${stockProduct.stockMin}\n`;
          
          if (stockProduct.stockMax) {
            stockInfo += `📈 ${language === "ca-ES" ? "Stock màxim" : "Stock máximo"}: ${stockProduct.stockMax}\n`;
          }
          
          const stockPercentage = stockProduct.stockMax 
            ? ((stockProduct.stockCurrent / stockProduct.stockMax) * 100).toFixed(1)
            : null;
          
          if (stockPercentage) {
            stockInfo += `\n📊 ${language === "ca-ES" ? "Percentatge d'estoc" : "Porcentaje de stock"}: ${stockPercentage}%\n`;
          }
          
          // Análisis de stock
          if (stockProduct.stockCurrent <= stockProduct.stockMin) {
            stockInfo += `\n⚠️ ${language === "ca-ES" ? "**ALERTA**: El stock està per sota del mínim. Cal reposar." : "**ALERTA**: El stock está por debajo del mínimo. Es necesario reponer."}\n`;
          } else if (stockProduct.stockMax && stockProduct.stockCurrent >= stockProduct.stockMax * 0.9) {
            stockInfo += `\n✅ ${language === "ca-ES" ? "**Stock alt**: El producte està gairebé al màxim." : "**Stock alto**: El producto está casi al máximo."}\n`;
          } else {
            stockInfo += `\n✅ ${language === "ca-ES" ? "Stock en nivells normals." : "Stock en niveles normales."}\n`;
          }
          
          const finalStockContent = nlg.generateResponse(stockInfo, language, {
            variation: "detailed",
            addPersonalTouch: true
          });
          
          return {
            content: finalStockContent,
            sources: [`/products/${stockProduct.id}`],
            suggestedActions: [
              {
                label: language === "ca-ES" ? "Veure producte" : "Ver producto",
                path: `/products/${stockProduct.id}`
              }
            ]
          };
        }
      }
    }

      // Respuesta genérica para consultas de datos
      return {
        content: getAiResponse(language, "dataQuery.generic")
      };
    } catch (error) {
      console.error("Error en processDataQuery:", error);
      return {
        content: getAiResponse(language, "error.dataQuery")
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

