# 🔤 Reglas de Traducciones - Sistema de i18n

## ⚠️ REGLA CRÍTICA

**TODO texto visible al usuario DEBE estar traducido a ambos idiomas (español y catalán).**

El idioma por defecto es **CATALÁN (ca-ES)**.

## 📋 Proceso Obligatorio

### 1. Antes de agregar cualquier texto visible:

1. **NO hardcodees textos directamente en componentes**
2. **Agrega las traducciones en `LanguageContext.tsx`** en AMBOS idiomas:
   - Español (`es-ES`)
   - Catalán (`ca-ES`)

### 2. Estructura de claves de traducción:

Usa nombres descriptivos y organizados por módulo:

```
"modulo.submodulo.elemento": "Texto en español"
```

Ejemplos:
- `"profile.title"` → "Perfil" / "Perfil"
- `"profile.firstName"` → "Nombre" / "Nom"
- `"profile.save"` → "Guardar cambios" / "Desar canvis"
- `"validation.firstName.required"` → "Este campo es obligatorio" / "Aquest camp és obligatori"

### 3. Uso en componentes:

**SIEMPRE usa el hook `useTranslation`:**

```tsx
import { useTranslation } from "../hooks/useTranslation";

function MiComponente() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("profile.title")}</h1>
      <button>{t("profile.save")}</button>
    </div>
  );
}
```

**NUNCA hagas esto:**
```tsx
// ❌ INCORRECTO - Texto hardcodeado
<h1>Perfil</h1>
<button>Guardar cambios</button>

// ✅ CORRECTO - Usando traducciones
<h1>{t("profile.title")}</h1>
<button>{t("profile.save")}</button>
```

## 🔍 Checklist de Validación

Antes de hacer commit, verifica:

- [ ] Todos los textos visibles usan `t("clave")`
- [ ] Las traducciones existen en AMBOS idiomas (es-ES y ca-ES)
- [ ] No hay textos hardcodeados en español
- [ ] El hook `useTranslation` está importado y usado
- [ ] Las claves de traducción siguen la convención de nombres

## 🛠️ Hook useTranslation

El hook `useTranslation` está en `src/presentation/hooks/useTranslation.ts` y:

- Proporciona la función `t()` para traducir
- Muestra warnings en desarrollo si falta una traducción
- Garantiza que siempre uses el sistema de traducciones

## 📝 Ejemplo Completo

### 1. Agregar traducciones en `LanguageContext.tsx`:

```typescript
"es-ES": {
  // ... otras traducciones
  "miModulo.titulo": "Mi Título",
  "miModulo.boton": "Mi Botón",
  "miModulo.mensaje": "Mi Mensaje"
},
"ca-ES": {
  // ... otras traducciones
  "miModulo.titulo": "El Meu Títol",
  "miModulo.boton": "El Meu Botó",
  "miModulo.mensaje": "El Meu Missatge"
}
```

### 2. Usar en componente:

```tsx
import { useTranslation } from "../hooks/useTranslation";

export function MiComponente() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("miModulo.titulo")}</h1>
      <button>{t("miModulo.boton")}</button>
      <p>{t("miModulo.mensaje")}</p>
    </div>
  );
}
```

## 🚨 Errores Comunes

### ❌ Error 1: Texto hardcodeado
```tsx
// INCORRECTO
<Label>Nombre</Label>
```

### ✅ Solución
```tsx
// CORRECTO
<Label>{t("profile.firstName")}</Label>
```

### ❌ Error 2: Traducción solo en un idioma
```typescript
"es-ES": {
  "nuevo.texto": "Texto en español"
}
// Falta en ca-ES
```

### ✅ Solución
```typescript
"es-ES": {
  "nuevo.texto": "Texto en español"
},
"ca-ES": {
  "nuevo.texto": "Text en català"
}
```

### ❌ Error 3: Usar useLanguage en lugar de useTranslation
```tsx
// Funciona pero no tiene validación
const { t } = useLanguage();
```

### ✅ Solución
```tsx
// Mejor: tiene validación y warnings
const { t } = useTranslation();
```

## 📚 Referencias

- Archivo de traducciones: `src/presentation/context/LanguageContext.tsx`
- Hook de traducción: `src/presentation/hooks/useTranslation.ts`
- Documentación del proyecto: `Docs/PROYECTO_FINAL.md`

## 🔄 Flujo de Trabajo Recomendado

1. **Planificar**: Identifica todos los textos que necesitas traducir
2. **Agregar traducciones**: Añade las claves en ambos idiomas en `LanguageContext.tsx`
3. **Implementar**: Usa `useTranslation` en los componentes
4. **Validar**: Verifica que todo funciona en ambos idiomas
5. **Commit**: Solo después de verificar que todo está traducido

---

**Última actualización:** 2025-11-27
**Autor:** Sistema de Reglas de Traducción

