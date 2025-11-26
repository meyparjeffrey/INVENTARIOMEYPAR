## Configuración segura de Supabase

1. Copia `Docs/env.example` a `.env.local` en la raíz.
2. Rellena las variables con los valores obtenidos desde el panel de Supabase:
   SUPABASE_URL= https://dmjulfufqftfrwhjhwlz.supabase.co
SUPABASE_ANON_KEY= eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtanVsZnVmcWZ0ZnJ3aGpod2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTk3NTIsImV4cCI6MjA3OTI5NTc1Mn0.XrSUpg718Gbwi_RkQknJxCENd9OyHfmWpN_QlscfQz0
SUPABASE_SERVICE_ROLE_KEY= eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtanVsZnVmcWZ0ZnJ3aGpod2x6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcxOTc1MiwiZXhwIjoyMDc5Mjk1NzUyfQ.rcwN-OKF9YtFvKEcbvVZyIVXO7jKscNk6ztm-CVio58
SUPABASE_ACCESS_TOKEN=
`
   - `SUPABASE_ACCESS_TOKEN`
3. Añade `.env.local` al `.gitignore` (ya debería estar cubierto). Nunca subas claves reales al repo.
4. En ejecución local, carga esta configuración desde `process.env`. En producción empaquetada con Electron usa los mismos nombres de variables.
5. Renueva claves comprometidas desde Supabase en caso de duda y actualiza `.env.local`.