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
    if (apiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(apiKey);
      } catch (error) {
        console.error("[GeminiAiService] Error inicializando Gemini:", error);
        this.geminiClient = null;
      }
    }
  }
  
  /**
   * Obtiene la API key de Gemini desde variables de entorno
   */
  private getApiKey(): string | null {
    // Intentar obtener de process.env (Electron/Node)
    if (typeof process !== "undefined" && process.env?.VITE_GEMINI_API_KEY) {
      return process.env.VITE_GEMINI_API_KEY;
    }
    
    // Intentar obtener de import.meta.env (Vite)
    if (typeof import !== "undefined" && import.meta?.env?.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
    
    return null;
  }
  
  /**
   * Verifica si Gemini está disponible
   */
  isAvailable(): boolean {
    return this.geminiClient !== null && this.getApiKey() !== null;
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
    // Si Gemini no está disponible, usar servicio local
    if (!this.isAvailable()) {
      console.warn("[GeminiAiService] Gemini no disponible, usando servicio local");
      return this.fallbackService.processMessage(userMessage, userPermissions, userRole, language);
    }
    
    try {
      const model = this.geminiClient!.getGenerativeModel({ model: "gemini-pro" });
      
      // Para consultas de datos, primero obtener información del servicio local
      // (que consulta directamente las tablas de Supabase) y usarla como contexto
      const lowerQuestion = userMessage.toLowerCase();
      const isDataQuery = lowerQuestion.includes("producto") || lowerQuestion.includes("producte") ||
                         lowerQuestion.includes("stock") || lowerQuestion.includes("estoc") ||
                         lowerQuestion.includes("movimiento") || lowerQuestion.includes("moviment") ||
                         lowerQuestion.includes("alarma") || lowerQuestion.includes("alerta");
      
      let dataContext = "";
      
      // Si es una consulta de datos, obtener información del servicio local
      if (isDataQuery) {
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
          }
        } catch (localError) {
          console.warn("[GeminiAiService] Error obteniendo contexto local:", localError);
        }
      }
      
      // Construir prompt con contexto del sistema y permisos
      const systemPrompt = this.buildSystemPrompt(userPermissions, userRole, language);
      const fullPrompt = `${systemPrompt}${dataContext}\n\nUsuario: ${userMessage}\n\nAsistente:`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        content: text,
        sources: [],
        suggestedActions: []
      };
    } catch (error) {
      console.error("[GeminiAiService] Error con Gemini, usando fallback:", error);
      
      // En caso de error, usar servicio local como fallback
      return this.fallbackService.processMessage(userMessage, userPermissions, userRole, language);
    }
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
      ? `Ets un assistent d'IA per a una aplicació de gestió d'inventari anomenada "MEYPAR". 
El teu objectiu és ajudar els usuaris a utilitzar l'aplicació de manera eficient.

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

INSTRUCCIONS:
1. Respon sempre en ${language === "ca-ES" ? "català" : "espanyol"}
2. Sé amable, clar i professional
3. Si l'usuari demana fer alguna acció que no té permisos, expliqui-li què necessita
4. Proporciona informació detallada sobre com utilitzar les funcionalitats
5. Si demana informació sobre productes, moviments o stock, indica que pots ajudar però que la informació exacta requereix consultar la base de dades

IMPORTANT: No facis accions destructives sense confirmació. Només proporciona instruccions i informació.`
      : `Eres un asistente de IA para una aplicación de gestión de inventario llamada "MEYPAR". 
Tu objetivo es ayudar a los usuarios a utilizar la aplicación de manera eficiente.

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

INSTRUCCIONES:
1. Responde siempre en ${language === "ca-ES" ? "catalán" : "español"}
2. Sé amable, claro y profesional
3. Si el usuario pide hacer alguna acción que no tiene permisos, explícale qué necesita
4. Proporciona información detallada sobre cómo utilizar las funcionalidades
5. Si pregunta información sobre productos, movimientos o stock, indica que puedes ayudar pero que la información exacta requiere consultar la base de datos

IMPORTANTE: No hagas acciones destructivas sin confirmación. Solo proporciona instrucciones e información.`;
    
    return basePrompt;
  }
}

