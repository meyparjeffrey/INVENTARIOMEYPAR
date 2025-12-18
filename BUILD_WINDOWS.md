# Build Windows (Release) - INVENTARI MEYPAR

Esta es la **única guía oficial** para generar el instalador de Windows.

## Requisitos

- Node.js **>= 18.19.0** (recomendado LTS)
- Dependencias instaladas: `npm install`
- Windows 10/11

## Importante (Modo Desarrollador)

Electron Builder puede necesitar crear enlaces simbólicos durante la descarga/extracción de utilidades (p.ej. `winCodeSign`).

- Activa **Modo desarrollador**: Configuración → Privacidad y seguridad → Para desarrolladores → **Modo de desarrollador**.
- Si tu empresa lo bloquea, ejecuta el build en una consola **como Administrador**.

## Build automático (recomendado)

Ejecuta este script (es el flujo que usamos para evitar errores típicos):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-windows-release.ps1
```

## Qué hace el script

1. Limpia la caché de `winCodeSign` (si quedó corrupta por un intento anterior).
2. Genera un `build/icon.ico` válido (a partir de `src/assets/logochat.svg`).
3. Ejecuta el build del proyecto (`npm run build`).
4. Empaqueta el instalador NSIS (usa la config única en `package.json` vía `electron-builder`).

## Resultado

El instalador se genera en:

- `release/INVENTARI MEYPAR-<version>-x64.exe`

Para la versión actual:

- `release/INVENTARI MEYPAR-0.7.0-x64.exe`

## Si falla

- Error típico: `Cannot create symbolic link ... privilegio requerido`
  - Solución: activar **Modo desarrollador** o ejecutar en consola **Administrador**.

---

Nota: `build/` y `release/` están ignorados por git; el script genera el icono y artefactos localmente.
