# Guía de Despliegue en Vercel

## Configuración para Web

Este proyecto está configurado para funcionar tanto en **Electron** (aplicación de escritorio) como en **Web** (Vercel).

### Diferencias Clave

1. **Configuración de Vite**:
   - **Electron**: `configs/vite.renderer.config.ts` - usa `base: "./"` para archivos locales
   - **Web**: `configs/vite.web.config.ts` - usa `base: "/"` para Vercel

2. **Router**:
   - **Electron**: `HashRouter` (para archivos `file://`)
   - **Web**: `BrowserRouter` (para URLs normales)

3. **Build**:
   - **Electron**: `npm run build` (incluye Electron main process)
   - **Web**: `npm run build:web` (solo renderer)

## Scripts Disponibles

```bash
# Desarrollo web (sin Electron)
npm run dev:web

# Build para web/Vercel
npm run build:web

# Desarrollo Electron (con Electron)
npm run dev

# Build Electron
npm run build
```

## Variables de Entorno

### Local (.env.local)

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon
```

### Vercel

Configura las siguientes variables de entorno en el dashboard de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Añade:
   - `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `tu-clave-anon`

**Nota**: Vercel requiere el prefijo `VITE_` para variables de entorno del cliente.

## Despliegue en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. Conecta tu repositorio GitHub a Vercel
2. Vercel detectará automáticamente `vercel.json`
3. Las variables de entorno se configuran en el dashboard de Vercel
4. Cada push a la rama `web` desplegará automáticamente

### Opción 2: Desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel

# Desplegar a producción
vercel --prod
```

## Configuración de vercel.json

El archivo `vercel.json` incluye:

- **Build Command**: `npm run build:web`
- **Output Directory**: `dist/web`
- **Rewrites**: Todas las rutas se redirigen a `index.html` (SPA)
- **Headers**: Cache para assets estáticos
- **Framework**: Vite (detectado automáticamente)

## Verificación Post-Despliegue

1. ✅ La aplicación carga en `/login`
2. ✅ Las rutas funcionan correctamente (SPA)
3. ✅ La conexión a Supabase funciona
4. ✅ El login/logout funciona
5. ✅ Las rutas protegidas requieren autenticación

## Troubleshooting

### Error: Variables de entorno no encontradas

- Verifica que las variables en Vercel tengan el prefijo `VITE_`
- Reinicia el deployment después de añadir variables

### Error: Rutas 404 en producción

- Verifica que `vercel.json` tenga el rewrite correcto
- Asegúrate de que `base: "/"` en `vite.web.config.ts`

### Error: Assets no cargan

- Verifica que `base: "/"` esté configurado (no `"./"`)
- Revisa la consola del navegador para rutas incorrectas

## Estructura de Archivos

```
├── configs/
│   ├── vite.renderer.config.ts  # Electron
│   └── vite.web.config.ts        # Web/Vercel
├── vercel.json                    # Configuración Vercel
├── package.json                   # Scripts build:web, dev:web
└── dist/
    ├── renderer/                 # Build Electron
    └── web/                       # Build Web/Vercel
```

