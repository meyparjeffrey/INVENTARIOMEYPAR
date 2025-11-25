import { createClient, type PostgrestError } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "[mcp-server] Debes definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const mcpSupabaseClient = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

export async function healthcheck(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const { error } = await mcpSupabaseClient
    .from("products")
    .select("id", { head: true, count: "exact" });

  if (!error) {
    return { ok: true };
  }

  if (error.code === "42P01") {
    // Tabla aún no creada, pero la conexión respondió → lo consideramos válido.
    return {
      ok: true,
      reason: "Supabase respondió pero la tabla products aún no existe."
    };
  }

  return { ok: false, reason: formatError(error) };
}

function formatError(error: PostgrestError) {
  return `${error.code ?? "ERR"} - ${error.message}`;
}

if (process.env.RUN_MCP_HEALTHCHECK === "true") {
  healthcheck()
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log("[mcp-server] Healthcheck:", result);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[mcp-server] No se pudo verificar Supabase", err);
      process.exitCode = 1;
    });
}

