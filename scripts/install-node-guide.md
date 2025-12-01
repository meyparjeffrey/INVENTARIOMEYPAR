# Guía de Instalación de Node.js para Usuario JEFFREYAPP

## Paso 1: Desinstalar Node.js Actual

1. **Abrir Panel de Control:**
   - Presiona `Win + R`
   - Escribe `appwiz.cpl` y presiona Enter

2. **Desinstalar Node.js:**
   - Busca "Node.js" en la lista
   - Haz clic derecho → Desinstalar
   - Sigue el asistente

3. **Ejecutar script de limpieza (opcional):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/uninstall-node.ps1
   ```

## Paso 2: Descargar Node.js

1. **Ir a la página oficial:**
   - Abre tu navegador
   - Ve a: https://nodejs.org/
   - Descarga la versión **LTS (Long Term Support)**
   - Actualmente: Node.js 20.x o superior

2. **Verificar la descarga:**
   - El archivo debe ser: `node-vXX.X.X-x64.msi` (donde XX es la versión)
   - Debe estar en: `C:\Users\JEFFREYAPP\Downloads\`

## Paso 3: Instalar Node.js

1. **Ejecutar el instalador:**
   - Haz doble clic en el archivo `.msi` descargado
   - **IMPORTANTE:** Asegúrate de estar logueado como usuario **JEFFREYAPP**

2. **Durante la instalación:**
   - ✅ Acepta los términos
   - ✅ Marca "Automatically install the necessary tools" (opcional pero recomendado)
   - ✅ **Ruta de instalación:** Deja la predeterminada (`C:\Program Files\nodejs\`)
   - ✅ **No cambies la ruta** a menos que sea absolutamente necesario

3. **Finalizar instalación:**
   - Haz clic en "Install"
   - Espera a que termine
   - Haz clic en "Finish"

## Paso 4: Verificar Instalación

1. **Abrir PowerShell NUEVO** (importante: cierra y abre uno nuevo)

2. **Verificar versiones:**
   ```powershell
   node --version
   npm --version
   ```

   Deberías ver algo como:
   ```
   v20.11.0
   10.2.4
   ```

3. **Verificar que está usando el usuario correcto:**
   ```powershell
   $env:USERNAME
   ```
   
   Debe mostrar: `JEFFREYAPP`

4. **Verificar configuración de npm:**
   ```powershell
   npm config list
   ```
   
   No debe haber referencias a "JeffreyBolaños" o rutas con "ñ"

## Paso 5: Configurar npm (Opcional pero Recomendado)

1. **Configurar caché de npm:**
   ```powershell
   npm config set cache C:\npm-cache --global
   ```

2. **Verificar configuración:**
   ```powershell
   npm config get cache
   ```
   
   Debe mostrar: `C:\npm-cache`

## Paso 6: Instalar Dependencias del Proyecto

1. **Navegar al proyecto:**
   ```powershell
   cd C:\Users\JEFFREYAPP\INVENTARIOMEYPAR
   ```

2. **Instalar dependencias:**
   ```powershell
   npm install
   ```

3. **Verificar que no hay errores:**
   - No debe haber referencias a "JeffreyBolaños"
   - No debe haber errores de rutas con caracteres especiales

## Paso 7: Ejecutar el Proyecto

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
npm run dev
```

## Solución de Problemas

### Si ves referencias al usuario anterior:
1. Cierra TODOS los terminales
2. Reinicia la computadora
3. Abre un terminal nuevo
4. Verifica con `npm config list`

### Si npm no se encuentra:
1. Verifica que Node.js está en PATH:
   ```powershell
   $env:PATH -split ';' | Select-String nodejs
   ```
2. Si no aparece, reinicia la computadora

### Si hay errores de permisos:
1. Ejecuta PowerShell como Administrador
2. Ejecuta los comandos de configuración

