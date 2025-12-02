# 🌐 Arquitectura del Sistema de Traducciones

## 📍 Ubicación Centralizada

**TODAS las traducciones de la aplicación están centralizadas en un solo archivo:**

```
src/presentation/context/LanguageContext.tsx
```

## 🏗️ Estructura del Sistema

### 1. Archivo Principal: `LanguageContext.tsx`

Este archivo contiene:

- **Contexto React** (`LanguageContext`) para compartir el idioma actual
- **Hook `useLanguage`** para acceder al contexto
- **Objeto `translations`** con TODAS las traducciones organizadas por idioma

### 2. Estructura de Traducciones

```typescript
const translations: Record<LanguageCode, Record<string, string>> = {
  "es-ES": {
    // Todas las traducciones en español
    "clave.traducion": "Texto en español",
    // ... más traducciones
  },
  "ca-ES": {
    // Todas las traducciones en catalán
    "clave.traducion": "Text en català",
    // ... más traducciones
  }
};
```

### 3. Idiomas Soportados

- **Español**: `"es-ES"` (código ISO)
- **Catalán**: `"ca-ES"` (código ISO) - **Idioma por defecto**

### 4. Organización de Claves

Las claves están organizadas por módulo/funcionalidad:

```
"modulo.submodulo.elemento": "Texto traducido"
```

Ejemplos:
- `"login.title"` → Título del login
- `"profile.firstName"` → Campo nombre del perfil
- `"products.title"` → Título de productos
- `"validation.firstName.required"` → Mensaje de validación

## 🔧 Componentes del Sistema

### 1. LanguageContext (`src/presentation/context/LanguageContext.tsx`)

**Responsabilidades:**
- Mantener el estado del idioma actual
- Proporcionar función `t()` para traducir claves
- Persistir preferencia de idioma en localStorage
- Cargar idioma desde `user_settings` si existe

**Uso básico:**
```tsx
import { useLanguage } from "../context/LanguageContext";

function MiComponente() {
  const { t, language, setLanguage } = useLanguage();
  
  return <h1>{t("profile.title")}</h1>;
}
```

### 2. Hook useTranslation (`src/presentation/hooks/useTranslation.ts`)

**Responsabilidades:**
- Envolver `useLanguage` con validación adicional
- Mostrar warnings en desarrollo si falta una traducción
- Garantizar que siempre se usen traducciones

**Uso recomendado:**
```tsx
import { useTranslation } from "../hooks/useTranslation";

function MiComponente() {
  const { t } = useTranslation();
  
  return <h1>{t("profile.title")}</h1>;
}
```

## 📊 Estadísticas Actuales

- **Total de claves de traducción**: ~200+ claves
- **Módulos traducidos**:
  - Login
  - Dashboard
  - Productos
  - Lotes
  - Movimientos
  - Alarmas
  - Escáner
  - Chat IA
  - Perfil de usuario
  - Configuración
  - Admin
  - Validaciones
  - Mensajes de error/éxito

## 🔄 Flujo de Trabajo

### Agregar Nuevas Traducciones

1. **Abrir** `src/presentation/context/LanguageContext.tsx`
2. **Localizar** la sección correspondiente (ej: `// Perfil de usuario`)
3. **Agregar** la clave en AMBOS idiomas:

```typescript
"es-ES": {
  // ... otras traducciones
  "miModulo.nuevaClave": "Texto en español"
},
"ca-ES": {
  // ... otras traducciones
  "miModulo.nuevaClave": "Text en català"
}
```

4. **Usar** en el componente:

```tsx
const { t } = useTranslation();
<h1>{t("miModulo.nuevaClave")}</h1>
```

## 📝 Convenciones de Nomenclatura

### Estructura de Claves

```
"modulo.submodulo.elemento.variante"
```

Ejemplos:
- `"profile.title"` → Título del módulo perfil
- `"profile.firstName"` → Campo nombre
- `"profile.save"` → Botón guardar
- `"profile.error.upload"` → Error al subir
- `"validation.firstName.required"` → Validación requerida

### Agrupación por Módulo

Las traducciones están agrupadas por comentarios:

```typescript
// Perfil de usuario
"profile.title": "Perfil",
"profile.subtitle": "Gestiona tu información personal",
// ...

// Validación perfil
"validation.firstName.required": "Este campo es obligatorio",
// ...
```

## 🎯 Ventajas de la Centralización

1. **Un solo lugar**: Todas las traducciones en un archivo
2. **Fácil mantenimiento**: Cambios rápidos y visibles
3. **Consistencia**: Mismo formato y estructura
4. **Búsqueda fácil**: Ctrl+F para encontrar cualquier texto
5. **Validación**: El hook `useTranslation` detecta traducciones faltantes
6. **TypeScript**: Autocompletado y verificación de tipos

## 🔍 Búsqueda de Traducciones

### En el código:
```bash
# Buscar uso de una traducción
grep -r "t(\"profile" src/
```

### En LanguageContext.tsx:
```bash
# Buscar clave específica
grep "profile.title" src/presentation/context/LanguageContext.tsx
```

## 📚 Archivos Relacionados

- **Traducciones**: `src/presentation/context/LanguageContext.tsx`
- **Hook mejorado**: `src/presentation/hooks/useTranslation.ts`
- **Reglas**: `Docs/REGLAS_TRADUCCIONES.md`
- **Este documento**: `Docs/ARQUITECTURA_TRADUCCIONES.md`

## ⚠️ Reglas Críticas

1. **NUNCA** hardcodear textos directamente en componentes
2. **SIEMPRE** agregar traducciones en AMBOS idiomas
3. **USAR** `useTranslation` en lugar de `useLanguage` cuando sea posible
4. **VERIFICAR** que las claves sigan la convención de nombres
5. **TESTEAR** en ambos idiomas antes de hacer commit

---

**Última actualización:** 2025-11-27
**Archivo principal:** `src/presentation/context/LanguageContext.tsx`

