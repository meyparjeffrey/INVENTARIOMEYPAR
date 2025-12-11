# Walkthrough: Build de Producción ALMACÉN MEYPAR

## Resumen
Se completó exitosamente el build de producción de la aplicación Electron, generando un instalador funcional para Windows.

## Problema Resuelto
El modo de desarrollo de Electron no funcionaba debido a un conflicto entre el paquete npm `electron` (que exporta la ruta del ejecutable) y el módulo interno de Electron. Este es un problema conocido con Electron v31.x y proyectos con `"type": "module"`.

**Solución adoptada:** Enfocarse en el build de producción, donde el código se empaqueta dentro del asar de Electron y `require('electron')` funciona correctamente.

## Archivos Generados

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `release/ALMACÉN MEYPAR-0.1.0-x64.exe` | 76.7 MB | Instalador NSIS |
| `release/win-unpacked/` | - | Versión portable |
| `release/latest.yml` | 364 B | Metadatos para auto-update |

## Proceso de Build

1. **Compilación del Renderer** (Vite) - 26 segundos
2. **Compilación del Main Process** (TypeScript)
3. **Copia del Splash Screen**
4. **Empaquetado con electron-builder**
5. **Generación del instalador NSIS**

## Comando para Generar Instalador

```bash
npm run build:win
```

## Configuración Clave

### package.json
```json
{
  "main": "dist/main/src/main/electron/main.cjs",
  "build": {
    "appId": "com.inventario.almacen",
    "productName": "ALMACÉN MEYPAR",
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## Notas Importantes

- El modo desarrollo (`npm run dev:electron`) **no funciona** debido al conflicto de módulos descrito.
- Para probar cambios, usar `npm run dev:web` para desarrollo web, luego `npm run build:win` para generar el instalador.
- El instalador incluye accesos directos de escritorio y menú inicio.
