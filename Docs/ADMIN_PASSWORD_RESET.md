# Reset de Contraseña por Administrador en Supabase

## Resumen

Supabase permite que los administradores cambien directamente la contraseña de un usuario **sin enviar un correo electrónico** usando la API de administración (`admin.updateUserById`). Esta funcionalidad requiere usar la **clave de servicio** (`service_role`) en lugar de la clave anónima.

## Requisitos

1. **Clave de servicio (Service Role Key)**: Necesitas tener acceso a `SUPABASE_SERVICE_ROLE_KEY` de tu proyecto.
   - ⚠️ **ADVERTENCIA DE SEGURIDAD**: Esta clave tiene permisos completos sobre tu base de datos. **NUNCA** la expongas en el frontend o código cliente. Solo úsala en:
     - Edge Functions de Supabase
     - Backend seguro (servidor propio)
     - Scripts de administración locales

2. **ID del usuario**: Necesitas el UUID del usuario en `auth.users` (columna `id`).

## Implementación

### Método 1: Usando la API de Administración de Supabase

```typescript
import { createClient } from "@supabase/supabase-js";

// ⚠️ IMPORTANTE: Usa la SERVICE_ROLE_KEY, NO la anon key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      persistSession: false // No necesitamos persistir sesión para operaciones admin
    }
  }
);

/**
 * Cambia la contraseña de un usuario directamente (sin enviar email).
 * @param userId - UUID del usuario en auth.users
 * @param newPassword - Nueva contraseña en texto plano (se hasheará automáticamente)
 */
async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      password: newPassword
    }
  );

  if (error) {
    throw new Error(`Error al cambiar contraseña: ${error.message}`);
  }

  console.log("✅ Contraseña actualizada exitosamente para:", data.user.email);
}
```

### Ejemplo de uso:

```typescript
// Obtener el ID del usuario desde auth.users o public.profiles
const userId = "6aa5d0d4-2a9f-4483-b6c8-0cf4c6c98ac4";

// Cambiar la contraseña
await resetUserPassword(userId, "NuevaContraseñaSegura123!");
```

## Vinculación entre `auth.users` y `public.profiles`

### Relación

- **`auth.users`**: Tabla del sistema de autenticación de Supabase (esquema `auth`).
  - Contiene: `id` (UUID), `email`, `encrypted_password`, `email_confirmed_at`, etc.
  - **No es accesible directamente** desde el cliente. Solo desde:
    - Edge Functions con service_role
    - Backend con service_role
    - SQL Editor de Supabase (con permisos adecuados)

- **`public.profiles`**: Tabla pública de perfiles de usuario (esquema `public`).
  - Contiene: `id` (UUID que referencia `auth.users.id`), `first_name`, `last_name`, `role`, `avatar_url`, etc.
  - **Es accesible** desde el cliente con RLS (Row Level Security) configurado.

### Cómo vincularlas

La vinculación se hace mediante una **foreign key** en `public.profiles`:

```sql
-- Ejemplo de migración para vincular las tablas
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Obtener información del usuario

```typescript
// Desde public.profiles (accesible desde cliente)
const { data: profile } = await supabaseClient
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();

// El profile.id es el mismo UUID que auth.users.id
// Usa profile.id para resetear la contraseña con admin.updateUserById
```

## Implementación Segura: Edge Function

Para mayor seguridad, implementa esta funcionalidad como una **Edge Function** de Supabase:

### 1. Crear Edge Function

```typescript
// supabase/functions/admin-reset-password/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Manejar CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar que el usuario que hace la petición es ADMIN
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No autorizado");
    }

    // Crear cliente con anon key para verificar el usuario
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario es ADMIN (desde public.profiles)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      throw new Error("Solo los administradores pueden resetear contraseñas");
    }

    // Obtener datos del body
    const { targetUserId, newPassword } = await req.json();

    if (!targetUserId || !newPassword) {
      throw new Error("targetUserId y newPassword son requeridos");
    }

    // Crear cliente admin con service_role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Cambiar la contraseña
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        password: newPassword
      }
    );

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Contraseña actualizada para ${data.user.email}`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
```

### 2. Llamar desde el frontend

```typescript
// En tu aplicación React/TypeScript
async function resetUserPasswordFromFrontend(
  targetUserId: string,
  newPassword: string
) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    throw new Error("No autenticado");
  }

  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/admin-reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        targetUserId,
        newPassword
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Error al resetear contraseña");
  }

  return result;
}
```

## Alternativa: Script de Administración Local

Si prefieres un script local (por ejemplo, para uso en desarrollo o administración):

```typescript
// scripts/admin-reset-password.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

async function main() {
  const userId = process.argv[2];
  const newPassword = process.argv[3];

  if (!userId || !newPassword) {
    console.error("Uso: ts-node admin-reset-password.ts <userId> <newPassword>");
    process.exit(1);
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password: newPassword
      }
    );

    if (error) {
      throw error;
    }

    console.log(`✅ Contraseña actualizada para: ${data.user.email}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
```

## Referencias

- [Supabase Admin API: updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
- [Supabase Auth: Users](https://supabase.com/docs/guides/auth/users)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Notas de Seguridad

1. ⚠️ **NUNCA** expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.
2. ✅ Usa Edge Functions o backend seguro para operaciones admin.
3. ✅ Valida siempre que el usuario que hace la petición es ADMIN.
4. ✅ Considera agregar logging/auditoría para cambios de contraseña.
5. ✅ Implementa validación de fortaleza de contraseña antes de cambiarla.

