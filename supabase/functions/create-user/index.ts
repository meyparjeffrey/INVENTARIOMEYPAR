/**
 * Edge Function para crear usuarios en Supabase.
 * 
 * Esta función usa service_role_key para crear usuarios en auth.users
 * y sus perfiles correspondientes en public.profiles.
 * 
 * @module supabase/functions/create-user
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Datos requeridos para crear un usuario.
 */
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "WAREHOUSE" | "VIEWER";
  isActive: boolean;
}

/**
 * Respuesta de la función.
 */
interface CreateUserResponse {
  success: boolean;
  userId?: string;
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
        } as CreateUserResponse),
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
    const body: CreateUserRequest = await req.json();

    // Validar datos requeridos
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Faltan datos requeridos: email, password, firstName, lastName",
        } as CreateUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Formato de email inválido",
        } as CreateUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar longitud de contraseña
    if (body.password.length < 6) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "La contraseña debe tener al menos 6 caracteres",
        } as CreateUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true, // Auto-confirmar email
    });

    if (authError) {
      console.error("[create-user] Error creando usuario en auth:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: authError.message || "Error al crear usuario en autenticación",
        } as CreateUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo crear el usuario en autenticación",
        } as CreateUserResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generar iniciales
    const initials = `${body.firstName.charAt(0)}${body.lastName.charAt(0)}`.toUpperCase();

    // Crear perfil en public.profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        initials,
        role: body.role || "WAREHOUSE",
        is_active: body.isActive ?? true,
      });

    if (profileError) {
      console.error("[create-user] Error creando perfil:", profileError);
      
      // Rollback: eliminar usuario de auth si falla la creación del perfil
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("[create-user] Error eliminando usuario después de fallo:", deleteError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: profileError.message || "Error al crear perfil de usuario",
        } as CreateUserResponse),
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
        userId: authData.user.id,
      } as CreateUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[create-user] Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      } as CreateUserResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

