import type { PostgrestError } from "@supabase/supabase-js";
import { Logger } from "@infrastructure/logging/logger";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

/**
 * Clase base para compartir cliente y tratamiento de errores.
 */
export abstract class BaseSupabaseRepository {
  protected readonly client = supabaseClient;

  protected handleError(context: string, error: PostgrestError | null) {
    if (!error) {
      return;
    }

    Logger.error(`[supabase] ${context}`, error);
    throw new Error(
      `Error en repositorio (${context}): ${error.message ?? "sin detalle"}`
    );
  }
}

