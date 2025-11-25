# Plan Inicial de Implementación

1. Configurar estructura base del repositorio:
   - Crear carpetas `src/domain`, `src/infrastructure`, `src/application`, `src/presentation`, `mcp-server`.
   - Añadir README breves por módulo describiendo objetivo y scripts básicos.
2. Inicializar proyecto (p.ej. con PNPM):
   - `package.json`, `tsconfig.json`, `eslint`, `prettier`.
   - Configuración base para React + Electron (placeholder) y scripts (`dev`, `build`, `lint`, `test`).
3. Definir entorno compartido:
   - `vite` o `electron-vite` para renderer, `electron-builder` config básica.
   - Configuración de i18n y theme placeholders.
4. Infraestructura Supabase:
   - `src/infrastructure/supabaseClient.ts` leyendo `.env`.
   - Tipos compartidos para tablas.
5. Servicios iniciales:
   - `AuthService`, `ProductService` (métodos stub) con tests unitarios de ejemplo.
6. Logging y manejo de errores:
   - Config base para `electron-log` y wrapper `Logger`.
7. Setup de pruebas:
   - Jest o Vitest configurado para domain/application.
8. Docu y scripts:
   - `README.md` raíz con instrucciones para instalar deps, configurar `.env`, correr tests.
9. Validar con usuario antes de codificar features adicionales.

