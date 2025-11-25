## Configuración segura de Supabase

1. Copia `Docs/env.example` a `.env.local` en la raíz.
2. Rellena las variables con los valores obtenidos desde el panel de Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ACCESS_TOKEN`
3. Añade `.env.local` al `.gitignore` (ya debería estar cubierto). Nunca subas claves reales al repo.
4. En ejecución local, carga esta configuración desde `process.env`. En producción empaquetada con Electron usa los mismos nombres de variables.
5. Renueva claves comprometidas desde Supabase en caso de duda y actualiza `.env.local`.