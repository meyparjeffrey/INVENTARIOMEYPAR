import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

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

