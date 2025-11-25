# Inventario con Electron + Supabase

Este repositorio contiene la aplicación de escritorio descrita en `Docs/PROYECTO COMPLETO.md`. Está organizada por capas (`domain`, `infrastructure`, `application`, `presentation`, `mcp-server`) y lista para empezar a implementar funcionalidades.

## Requisitos

- Node.js >= 18.19 (incluye npm)
- PNPM/NPM/Yarn para instalar dependencias
- Supabase project configurado (ver `Docs/CREDENCIALES SUPEBASE.md`)

## Primeros pasos

```bash
cp Docs/env.example .env.local      # rellena tus claves reales
npm install                         # instala dependencias
npm run dev                         # levanta renderer + electron
```

Scripts clave:

| Script        | Descripción                                             |
| ------------- | ------------------------------------------------------- |
| `dev`         | Arranca Vite + Electron en paralelo.                    |
| `build`       | Compila renderer y proceso principal.                   |
| `lint`        | Ejecuta ESLint con las reglas del proyecto.             |
| `test`        | Ejecuta Vitest (unit tests capa application/domain).    |
| `mcp:dev`     | Inicia el servidor MCP (pendiente de implementación).   |
| `typecheck`   | Verificación estricta de TypeScript.                    |

## Estructura

- `src/domain`: entidades puras y lógica del negocio.
- `src/infrastructure`: clientes de Supabase, logger, scanner, etc.
- `src/application`: servicios/casos de uso (ej. `AuthService`).
- `src/presentation`: React + UI.
- `src/main/electron`: proceso principal de Electron.
- `mcp-server`: servidor MCP con herramientas para la IA.

## Tests y logging

- Ejemplo inicial en `src/application/services/__tests__/AuthService.test.ts`.
- Usa `Logger` (wrapper de `electron-log`) para centralizar trazas.
- Añade nuevos tests unitarios cada vez que integres lógica crítica.

## Próximos pasos sugeridos

1. Implementar migraciones de Supabase (tablas `products`, `product_batches`, etc.).
2. Añadir rutas reales en `mcp-server` basadas en esas tablas.
3. Construir UI de Login → Dashboard → Productos siguiendo `Docs/PROJECT_RULES.md`.

