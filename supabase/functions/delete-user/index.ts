/**
 * Edge Function para eliminar usuarios de Supabase.
 * 
 * Esta función usa service_role_key para eliminar usuarios de auth.users
 * y sus perfiles correspondientes en public.profiles.
 * 
 * @module supabase/functions/delete-user
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Datos requeridos para eliminar un usuario.
 */
interface DeleteUserRequest {
  userId: string;
}

/**
 * Respuesta de la función.
 */
interface DeleteUserResponse {
  success: boolean;
  error?: string;
}

/**
 * Maneja las peticiones CORS.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Obtener service_role_key desde variables de entorno
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuración del servidor incorrecta",
        } as DeleteUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crear cliente con service_role_key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parsear body
    const body: DeleteUserRequest = await req.json();

    // Validar datos requeridos
    if (!body.userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Falta el ID del usuario",
        } as DeleteUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Primero eliminar el perfil (si existe)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", body.userId);

    // Si hay error al eliminar el perfil, registrar pero continuar
    if (profileError) {
      console.warn("[delete-user] Error eliminando perfil (puede que no exista):", profileError);
    }

    // Luego eliminar el usuario de auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(body.userId);

    if (authError) {
      console.error("[delete-user] Error eliminando usuario de auth:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: authError.message || "Error al eliminar usuario de autenticación",
        } as DeleteUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Éxito
    return new Response(
      JSON.stringify({
        success: true,
      } as DeleteUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[delete-user] Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      } as DeleteUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

