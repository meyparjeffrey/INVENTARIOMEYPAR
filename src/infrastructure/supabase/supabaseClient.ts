import { createClient } from "@supabase/supabase-js";

type SupabaseEnvKey = "SUPABASE_URL" | "SUPABASE_ANON_KEY";

const getEnvValue = (key: SupabaseEnvKey): string | undefined => {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  try {
    const viteEnv = (import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }).env;

    return viteEnv?.[`VITE_${key}`];
  } catch {
    return undefined;
  }
};

const url = getEnvValue("SUPABASE_URL");
const anonKey = getEnvValue("SUPABASE_ANON_KEY");

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Faltan SUPABASE_URL o SUPABASE_ANON_KEY. Revisa tu .env.local"
  );
}

export const supabaseClient = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    detectSessionInUrl: false
  }
});

