# Guía de Build para Windows - INVENTARI MEYPAR (Instalador)

Esta guía documenta el proceso para generar el **INSTALADOR** de Windows de la aplicación INVENTARI MEYPAR.

## 📋 Requisitos Previos

- Node.js instalado
- Dependencias instaladas (`npm install`)

## 🚀 Proceso de Build Manual

Para generar el instalador correctamente, evitando errores de firma y configuración, usa el siguiente comando unificado:

```cmd
cmd /c "npm run build && node scripts/build-win.cjs"
```

### ¿Qué hace este comando?

1. **`npm run build`**: Compila el código fuente (React + Electron) a la carpeta `dist`.
2. **`node scripts/build-win.cjs`**: Ejecuta el script de empaquetado personalizado que:
   - Configura el entorno para saltar la firma de código (evita error `signtool.exe`).
   - Genera el instalador NSIS en español.
   - Empaqueta todo en un archivo `.exe`.

## 📦 Resultado

El instalador se generará en:
```
release/INVENTARI MEYPAR-0.1.0-x64.exe
```

- **Tipo:** Instalador de Windows (NSIS)
- **Tamaño:** ~93 MB
- **Ubicación:** Carpeta `release` en la raíz del proyecto.

## ⚙️ Configuración

La configuración del build se encuentra controlada principalmente por:

1. **[scripts/build-win.cjs](file:///scripts/build-win.cjs)**: Define la configuración de Electron Builder, overrides de firma y configuración NSIS.
2. **package.json**: Define metadatos básicos, aunque el script `build-win.cjs` tiene precedencia para la configuración de build.

## 🔧 Solución de Problemas Comunes

### Error: "signtool.exe not found" o errores de firma
El script `scripts/build-win.cjs` inyecta automáticamente un "shim" (simulador) de `signtool` en el PATH. Si ves este error, asegúrate de estar ejecutando el build a través de `node scripts/build-win.cjs` y no directamente con `electron-builder`.

### Error: "LoadLanguageFile not valid" (NSIS)
Esto ocurre si hay conflictos con scripts NSIS personalizados. El script de build utiliza una configuración limpia. Si modificas configuraciones de idioma, asegúrate de no reintroducir `installer.nsh` conflictivos.

### El instalador está en inglés
Por defecto está configurado en `es_ES` (Español). Si aparece en inglés, verifica la configuración `installerLanguages` en `scripts/build-win.cjs`.

## 🔄 Actualizar Versión

1. Edita `package.json` y cambia `"version": "0.X.X"`.
2. Ejecuta el comando de build nuevamente.

---
**Versión de guía:** 2.0 (Instalador NSIS)
