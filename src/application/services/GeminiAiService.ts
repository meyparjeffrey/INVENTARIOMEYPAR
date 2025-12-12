import type { PermissionKey, UserProfile } from "@domain/entities";
import type { IAiService } from "./interfaces/IAiService";
import type { AiResponse } from "@infrastructure/ai/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiResponse } from "@infrastructure/ai/responseTranslations";
import { AiChatService } from "./AiChatService";

type LanguageCode = "es-ES" | "ca-ES";

/**
 * Servicio de IA que usa Google Gemini API
 * Mantiene compatibilidad con el sistema local mediante la interfaz común
 */
export class GeminiAiService implements IAiService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private fallbackService: AiChatService;
  
  constructor() {
    // Crear servicio local como fallback si Gemini no está disponible
    this.fallbackService = new AiChatService();
    
    // Inicializar cliente de Gemini si hay API key
    const apiKey = this.getApiKey();
    console.log("[GeminiAiService] Constructor - API key encontrada:", apiKey ? `${apiKey.substring(0, 10)}...` : "NO");
    if (apiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(apiKey);
        console.log("[GeminiAiService] Cliente de Gemini inicializado correctamente");
      } catch (error) {
        console.error("[GeminiAiService] Error inicializando Gemini:", error);
        this.geminiClient = null;
      }
    } else {
      console.warn("[GeminiAiService] No se encontró API key de Gemini");
    }
  }
  
  /**
   * Obtiene la API key de Gemini desde variables de entorno
   */
  private getApiKey(): string | null {
    // Intentar obtener de process.env (Electron/Node)
    if (typeof process !== "undefined" && process.env?.VITE_GEMINI_API_KEY) {
      const key = process.env.VITE_GEMINI_API_KEY;
      console.log("[GeminiAiService] API key encontrada en process.env");
      return key;
    }
    
    // Intentar obtener de import.meta.env (Vite inyecta las variables aquí en build time)
    try {
      const viteEnv = (import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
      }).env;
      
      // Buscar tanto con VITE_ prefix como sin él
      const key = viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.GEMINI_API_KEY || null;
      if (key) {
        console.log("[GeminiAiService] API key encontrada en import.meta.env");
      } else {
        console.warn("[GeminiAiService] API key NO encontrada en import.meta.env, keys disponibles:", Object.keys(viteEnv || {}));
      }
      return key;
    } catch (error) {
      console.error("[GeminiAiService] Error accediendo a import.meta.env:", error);
      return null;
    }
  }
  
  /**
   * Verifica si Gemini está disponible
   */
  isAvailable(): boolean {
    const apiKey = this.getApiKey();
    const available = this.geminiClient !== null && apiKey !== null;
    console.log("[GeminiAiService] isAvailable() - cliente:", this.geminiClient !== null, "API key:", apiKey !== null, "total:", available);
    return available;
  }
  
  /**
   * Procesa un mensaje usando Google Gemini
   */
  async processMessage(
    userMessage: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile["role"],
    language: LanguageCode = "es-ES"
  ): Promise<AiResponse> {
    console.log("[GeminiAiService] processMessage llamado - Verificando disponibilidad...");
    
    // Si Gemini no está disponible, usar servicio local
    if (!this.isAvailable()) {
      console.warn("[GeminiAiService] ❌ Gemini no disponible, usando servicio local como fallback");
      return this.fallbackService.processMessage(userMessage, userPermissions, userRole, language);
    }
    
    console.log("[GeminiAiService] ✅ Gemini disponible, procesando mensaje con Gemini API");
    
    // Intentar modelos en orden de preferencia (más recientes primero)
    // Algunos modelos pueden estar descontinuados o no disponibles en todas las regiones
    // El error 404 puede ocurrir tanto al crear el modelo como al generar contenido
    const modelOptions = [
      "gemini-2.0-flash-exp",  // Modelo experimental más reciente
      "gemini-1.5-flash",      // Flash estable (puede no estar disponible)
      "gemini-1.5-pro",        // Pro estable
      "gemini-pro"             // Fallback básico (más compatible)
    ];
    
    // Preparar prompt con contexto
    const lowerQuestion = userMessage.toLowerCase();
    const isDataQuery = lowerQuestion.includes("producto") || lowerQuestion.includes("producte") ||
                       lowerQuestion.includes("stock") || lowerQuestion.includes("estoc") ||
                       lowerQuestion.includes("movimiento") || lowerQuestion.includes("moviment") ||
                       lowerQuestion.includes("alarma") || lowerQuestion.includes("alerta");
    
    let dataContext = "";
    
    // Si es una consulta de datos, obtener información del servicio local
    if (isDataQuery) {
      console.log("[GeminiAiService] Detectada consulta de datos, obteniendo contexto de Supabase...");
      try {
        const localResponse = await this.fallbackService.processMessage(
          userMessage,
          userPermissions,
          userRole,
          language
        );
        
        // Si el servicio local tiene información útil, usarla como contexto
        if (localResponse.content && !localResponse.content.includes("PROCESS_DATA_QUERY")) {
          dataContext = `\n\nInformación actualizada de la base de datos:\n${localResponse.content}\n\nUsa esta información para responder de manera precisa.`;
          console.log("[GeminiAiService] Contexto de datos obtenido y añadido al prompt");
        }
      } catch (localError) {
        console.warn("[GeminiAiService] Error obteniendo contexto local:", localError);
      }
    }
    
    // Construir prompt con contexto del sistema y permisos
    const systemPrompt = this.buildSystemPrompt(userPermissions, userRole, language);
    const fullPrompt = `${systemPrompt}${dataContext}\n\nUsuario: ${userMessage}\n\nAsistente:`;
    
    // Intentar cada modelo hasta que uno funcione (el error 404 puede ocurrir en generateContent)
    let lastError: Error | null = null;
    
    for (const modelName of modelOptions) {
      try {
        console.log(`[GeminiAiService] Intentando modelo: ${modelName}`);
        const model = this.geminiClient!.getGenerativeModel({ model: modelName });
        
        console.log("[GeminiAiService] 🔵 ENVIANDO PROMPT A GEMINI API - Mensaje:", userMessage.substring(0, 50));
        console.log("[GeminiAiService] Usando modelo:", modelName);
        
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("[GeminiAiService] ✅✅✅ RESPUESTA RECIBIDA DE GEMINI API");
        console.log("[GeminiAiService] ✅ Modelo usado:", modelName);
        console.log("[GeminiAiService] ✅ Longitud respuesta:", text.length, "caracteres");
        console.log("[GeminiAiService] ✅ Primeros 200 caracteres:", text.substring(0, 200));
        
        // Si llegamos aquí, el modelo funcionó correctamente
        return {
          content: text,
          sources: ["gemini-api"],
          suggestedActions: []
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const is404Error = errorMessage.includes("404") || errorMessage.includes("not found");
        
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (is404Error) {
          console.warn(`[GeminiAiService] ⚠️ Modelo ${modelName} no disponible (404), intentando siguiente...`);
          continue; // Intentar siguiente modelo
        } else {
          // Error diferente a 404, loguear y continuar con siguiente modelo
          console.warn(`[GeminiAiService] ⚠️ Error con modelo ${modelName}:`, errorMessage);
          continue;
        }
      }
    }
    
    // Si llegamos aquí, todos los modelos fallaron
    console.error("[GeminiAiService] ❌ Todos los modelos fallaron");
    console.error("[GeminiAiService] Último error:", lastError?.message);
    console.warn("[GeminiAiService] Usando servicio local como fallback debido al error");
    return this.fallbackService.processMessage(userMessage, userPermissions, userRole, language);
  }
  
  /**
   * Construye el prompt del sistema con contexto de la aplicación
   */
  private buildSystemPrompt(
    userPermissions: PermissionKey[],
    userRole?: UserProfile["role"],
    language: LanguageCode = "es-ES"
  ): string {
    const roleInfo = userRole || "No identificado";
    const permissionsList = userPermissions.join(", ");
    
    const basePrompt = language === "ca-ES"
      ? `Ets un assistent d'IA conversacional i intel·ligent per a una aplicació de gestió d'inventari anomenada "MEYPAR". 

El teu objectiu és tenir converses naturals i útils amb els usuaris, ajudant-los a entendre i utilitzar l'aplicació de manera eficient.

CONTEXT DE L'USUARI:
- Rol: ${roleInfo}
- Permisos: ${permissionsList}

FUNCIONALITATS DE L'APLICACIÓ:
- Gestió de productes (crear, editar, veure, eliminar)
- Control de lots per a productes
- Moviments d'inventari (entrades i sortides)
- Escàner de codis de barres
- Reportes i exportacions
- Sistema de permisos granular

BASE DE DADES:
L'aplicació utilitza Supabase amb les següents taules principals:
- products: Productes de l'inventari
- product_batches: Lots de productes
- inventory_movements: Moviments d'inventari
- batch_defect_reports: Reportes de defectes en lots
- profiles: Perfils d'usuaris
- user_permissions: Permisos per usuari

ESTIL DE RESPOSTA:
1. Respon sempre en català amb un to conversacional i natural
2. Quan algú et saluda (com "HOLA", "Hola", etc.), respon de manera amable i personalitzada, NO repeteixis un text genèric de llista
3. En lloc de llistes genèriques, fes preguntes conversacionals o ofereix ajuda específica
4. Sé proactiu: si veus que l'usuari necessita ajuda, pregunta què vol fer específicament
5. Si demanes informació sobre productes, moviments o stock, indica que pots ajudar però que la informació exacta requereix consultar la base de dades
6. Si l'usuari demana fer alguna acció que no té permisos, expliqui-li què necessita de manera clara

IMPORTANT: No facis accions destructives sense confirmació. Només proporciona instruccions i informació. Respon de manera natural i conversacional, no com un manual.`
      : `Eres un asistente de IA conversacional e inteligente para una aplicación de gestión de inventario llamada "MEYPAR". 

Tu objetivo es tener conversaciones naturales y útiles con los usuarios, ayudándolos a entender y utilizar la aplicación de manera eficiente.

CONTEXTO DEL USUARIO:
- Rol: ${roleInfo}
- Permisos: ${permissionsList}

FUNCIONALIDADES DE LA APLICACIÓN:
- Gestión de productos (crear, editar, ver, eliminar)
- Control de lotes para productos
- Movimientos de inventario (entradas y salidas)
- Escáner de códigos de barras
- Reportes y exportaciones
- Sistema de permisos granular

BASE DE DATOS:
La aplicación utiliza Supabase con las siguientes tablas principales:
- products: Productos del inventario
- product_batches: Lotes de productos
- inventory_movements: Movimientos de inventario
- batch_defect_reports: Reportes de defectos en lotes
- profiles: Perfiles de usuarios
- user_permissions: Permisos por usuario

ESTILO DE RESPUESTA:
1. Responde siempre en español con un tono conversacional y natural
2. Cuando alguien te saluda (como "HOLA", "Hola", etc.), responde de manera amable y personalizada, NO repitas un texto genérico de lista
3. En lugar de listas genéricas, haz preguntas conversacionales o ofrece ayuda específica
4. Sé proactivo: si ves que el usuario necesita ayuda, pregunta qué quiere hacer específicamente
5. Si pregunta información sobre productos, movimientos o stock, indica que puedes ayudar pero que la información exacta requiere consultar la base de datos
6. Si el usuario pide hacer alguna acción que no tiene permisos, explícale qué necesita de manera clara

IMPORTANTE: No hagas acciones destructivas sin confirmación. Solo proporciona instrucciones e información. Responde de manera natural y conversacional, no como un manual.`;
    
    return basePrompt;
  }
}

