# 📋 Reglas de Desarrollo - ALMACÉN MEYPAR

## 🎯 Estrategia de Desarrollo

### **Para Desarrollo Rápido (UI, Estilos, Lógica de Negocio)**
✅ **USAR: `npm run dev:web`** (Localhost - Puerto 5173)

**Ventajas:**
- ⚡ **Cambios instantáneos** con Hot Module Replacement (HMR)
- 🔄 **Recarga automática** al guardar archivos
- 🚀 **Más rápido** - No necesita compilar Electron
- 🎨 **Ideal para:** React, Tailwind CSS, componentes, páginas, lógica de negocio
- 🌐 **Acceso:** `http://localhost:5173`

**Cuándo usar:**
- Desarrollo de componentes React
- Cambios en estilos (CSS/Tailwind)
- Lógica de aplicación
- Integración con Supabase
- Testing de funcionalidades web
- Desarrollo de rutas y navegación

---

### **Para Funcionalidades Específicas de Electron**
✅ **USAR: `npm run dev`** (Electron Desktop)

**Ventajas:**
- 💻 **Entorno completo** de Electron
- 🪟 **Prueba splash screen** en tiempo real
- 🔧 **Prueba menú** y atajos de teclado
- 📦 **Prueba integración** con sistema operativo
- 🎯 **Ideal para:** Funcionalidades específicas de Electron

**Cuándo usar:**
- Cambios en `src/main/electron/main.ts`
- Modificaciones del splash screen
- Cambios en el menú de Electron
- Pruebas de instalador
- Funcionalidades nativas de Windows

---

### **Para Builds de Producción**
✅ **USAR: `npm run build:win`** (Windows Installer)

**Cuándo usar:**
- Antes de distribuir la aplicación
- Para probar el instalador final
- Para verificar que todo funciona en producción
- Para crear el `.exe` instalable

---

## 📝 Flujo de Trabajo Recomendado

### **Desarrollo Diario (90% del tiempo)**
```bash
# 1. Iniciar servidor de desarrollo web
npm run dev:web

# 2. Abrir navegador en http://localhost:5173
# 3. Hacer cambios en el código
# 4. Ver cambios instantáneos en el navegador
```

### **Pruebas de Electron (cuando sea necesario)**
```bash
# 1. Cerrar servidor web (Ctrl+C)
# 2. Iniciar Electron
npm run dev

# 3. Probar funcionalidades específicas
# 4. Volver a desarrollo web cuando termines
```

### **Build Final (antes de release)**
```bash
# 1. Asegurarse de que todo funciona en dev:web
# 2. Probar en Electron (npm run dev)
# 3. Hacer build de Windows
npm run build:win

# 4. Probar el instalador generado
```

---

## 🔄 Regla de Oro

> **"Desarrollo en Web, Prueba en Electron, Build para Producción"**

1. **Desarrollo:** Siempre usar `npm run dev:web` para ver cambios rápidos
2. **Pruebas:** Usar `npm run dev` solo cuando necesites probar algo específico de Electron
3. **Producción:** Hacer build solo cuando todo esté listo

---

## 🚨 Excepciones

### **Usar Electron (`npm run dev`) cuando:**
- ✏️ Modificas `src/main/electron/main.ts`
- 🎨 Cambias el splash screen (`src/main/electron/splash.html`)
- 🔧 Cambias configuración de Electron
- 📦 Pruebas del instalador
- 🪟 Pruebas de ventanas y menús

### **Usar Web (`npm run dev:web`) cuando:**
- ✏️ Modificas cualquier componente React
- 🎨 Cambias estilos CSS/Tailwind
- 🔧 Cambias lógica de negocio
- 📄 Modificas páginas o rutas
- 🔌 Integración con Supabase
- 🧪 Testing de funcionalidades

---

## 📊 Comparación Rápida

| Aspecto | `dev:web` | `dev` (Electron) |
|---------|-----------|------------------|
| **Velocidad** | ⚡⚡⚡ Muy rápido | ⚡⚡ Rápido |
| **HMR** | ✅ Sí | ✅ Sí |
| **Recarga** | 🔄 Automática | 🔄 Automática |
| **Splash Screen** | ❌ No | ✅ Sí |
| **Menú Electron** | ❌ No | ✅ Sí |
| **Funcionalidades OS** | ❌ No | ✅ Sí |
| **Ideal para** | Desarrollo diario | Pruebas Electron |

---

## 🎯 Recomendación Final

**Para el 90% del desarrollo:**
```bash
npm run dev:web
```

**Para el 10% restante (funcionalidades Electron):**
```bash
npm run dev
```

**Para builds finales:**
```bash
npm run build:win
```

---

## 📚 Scripts Disponibles

- `npm run dev:web` - Desarrollo web (localhost:5173) ⭐ **RECOMENDADO**
- `npm run dev` - Desarrollo Electron completo
- `npm run build:web` - Build para Vercel
- `npm run build:win` - Build Windows (.exe)
- `npm run build:win:dir` - Build Windows (carpeta, sin instalador)

