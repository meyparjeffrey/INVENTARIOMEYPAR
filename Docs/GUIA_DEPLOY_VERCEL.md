# 🚀 Guía Paso a Paso: Desplegar en Vercel

## ✅ Lo que YA está hecho

1. ✅ Configuración de Vite para web creada
2. ✅ Scripts `dev:web` y `build:web` añadidos
3. ✅ `vercel.json` configurado
4. ✅ Código subido a GitHub (rama `web`)
5. ✅ Build de prueba exitoso

## 📋 Pasos para desplegar en Vercel

### Paso 1: Iniciar sesión en Vercel

1. Ve a https://vercel.com/login
2. Inicia sesión con tu cuenta (GitHub, GitLab, Bitbucket o email)

### Paso 2: Crear nuevo proyecto

1. Haz clic en **"Add New..."** → **"Project"**
2. O ve directamente a: https://vercel.com/new

### Paso 3: Importar repositorio

1. Haz clic en **"Continue with GitHub"** (o tu proveedor Git)
2. Autoriza Vercel si es necesario
3. Busca y selecciona: **`meyparjeffrey/INVENTARIOMEYPAR`**
4. Haz clic en **"Import"**

### Paso 4: Configurar proyecto

1. **Nombre del proyecto**: `inventario-almacen-web` (o el que prefieras)
2. **Framework Preset**: Vercel debería detectar **Vite** automáticamente
3. **Root Directory**: `.` (raíz del proyecto)
4. **Build Command**: `npm run build:web` (ya está en `vercel.json`)
5. **Output Directory**: `dist/web` (ya está en `vercel.json`)
6. **Install Command**: `npm install` (por defecto)

### Paso 5: Seleccionar rama

1. En **"Production Branch"**, selecciona: **`web`**
2. (Opcional) Configura ramas de preview si lo deseas

### Paso 6: Configurar Variables de Entorno ⚠️ IMPORTANTE

1. Haz clic en **"Environment Variables"**
2. Añade las siguientes variables:

#### Variable 1:
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://dmjulfufqftfrwhjhwlz.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variable 2:
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtanVsZnVmcWZ0ZnJ3aGpod2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTk3NTIsImV4cCI6MjA3OTI5NTc1Mn0.XrSUpg718Gbwi_RkQknJxCENd9OyHfmWpN_QlscfQz0`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**⚠️ NOTA**: Asegúrate de que las variables tengan el prefijo `VITE_` para que Vite las inyecte en el build.

### Paso 7: Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que termine el build (2-5 minutos)
3. ¡Listo! 🎉

### Paso 8: Verificar despliegue

1. Una vez completado, Vercel te dará una URL como:
   - `https://inventario-almacen-web.vercel.app`
2. Abre la URL y verifica:
   - ✅ La aplicación carga en `/login`
   - ✅ El login funciona con Supabase
   - ✅ La navegación funciona correctamente

## 🔧 Configuración Automática

El archivo `vercel.json` ya está configurado con:

- ✅ Build command: `npm run build:web`
- ✅ Output directory: `dist/web`
- ✅ Rewrites para SPA (todas las rutas → `index.html`)
- ✅ Headers de cache para assets

## 📝 Notas Importantes

1. **Variables de entorno**: Deben tener el prefijo `VITE_` para que Vite las inyecte
2. **Rama**: Asegúrate de seleccionar la rama `web`
3. **Build**: El primer build puede tardar más (instalación de dependencias)
4. **Actualizaciones**: Cada push a la rama `web` desplegará automáticamente

## 🐛 Troubleshooting

### Error: Variables de entorno no encontradas

- Verifica que las variables tengan el prefijo `VITE_`
- Reinicia el deployment después de añadir variables

### Error: Build falla

- Verifica que `package.json` tenga el script `build:web`
- Revisa los logs de build en Vercel

### Error: Rutas 404

- Verifica que `vercel.json` tenga el rewrite correcto
- Asegúrate de que `base: "/"` en `vite.web.config.ts`

## 🔗 Enlaces Útiles

- Dashboard Vercel: https://vercel.com/dashboard
- Documentación: https://vercel.com/docs
- Logs de deployment: Disponibles en el dashboard del proyecto

## ✅ Checklist Final

- [ ] Iniciado sesión en Vercel
- [ ] Repositorio importado
- [ ] Rama `web` seleccionada
- [ ] Variables de entorno configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Deployment completado
- [ ] Aplicación funciona en la URL de Vercel
- [ ] Login funciona correctamente
- [ ] Navegación funciona

---

**¿Necesitas ayuda?** Revisa los logs de build en el dashboard de Vercel o consulta la documentación.

