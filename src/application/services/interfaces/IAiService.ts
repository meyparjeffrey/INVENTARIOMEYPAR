import type { PermissionKey, UserProfile } from "@domain/entities";
import type { AiResponse } from "@infrastructure/ai/types";

type LanguageCode = "es-ES" | "ca-ES";

/**
 * Interfaz común para todos los servicios de IA
 * Permite intercambiar entre sistema local y Google Gemini
 */
export interface IAiService {
  /**
   * Procesa un mensaje del usuario y genera una respuesta
   */
  processMessage(
    userMessage: string,
    userPermissions: PermissionKey[],
    userRole?: UserProfile["role"],
    language?: LanguageCode
  ): Promise<AiResponse>;
}

