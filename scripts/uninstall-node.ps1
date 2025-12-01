# Script para desinstalar Node.js y limpiar configuraciones
# Ejecutar como administrador: powershell -ExecutionPolicy Bypass -File scripts/uninstall-node.ps1

Write-Host "=== Desinstalación de Node.js ===" -ForegroundColor Cyan

# 1. Desinstalar Node.js desde Programas
Write-Host "`n1. Desinstalando Node.js desde Programas y características..." -ForegroundColor Yellow
Write-Host "   Ve a: Panel de Control > Programas > Desinstalar un programa" -ForegroundColor Gray
Write-Host "   Busca 'Node.js' y desinstálalo" -ForegroundColor Gray
Write-Host "   Presiona Enter cuando hayas terminado..." -ForegroundColor Yellow
Read-Host

# 2. Eliminar carpetas de npm
Write-Host "`n2. Eliminando carpetas de npm..." -ForegroundColor Yellow
$npmPaths = @(
    "$env:APPDATA\npm",
    "$env:APPDATA\npm-cache",
    "$env:LOCALAPPDATA\npm-cache"
)

foreach ($path in $npmPaths) {
    if (Test-Path $path) {
        Write-Host "   Eliminando: $path" -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. Eliminar variables de entorno de PATH (manual)
Write-Host "`n3. Verificando variables de entorno..." -ForegroundColor Yellow
$currentPath = $env:PATH
if ($currentPath -like "*nodejs*" -or $currentPath -like "*npm*") {
    Write-Host "   ⚠️  ADVERTENCIA: Hay referencias a Node.js en PATH" -ForegroundColor Red
    Write-Host "   Ve a: Sistema > Configuración avanzada > Variables de entorno" -ForegroundColor Gray
    Write-Host "   Elimina cualquier entrada relacionada con Node.js o npm" -ForegroundColor Gray
    Write-Host "   Presiona Enter cuando hayas terminado..." -ForegroundColor Yellow
    Read-Host
} else {
    Write-Host "   ✓ No se encontraron referencias a Node.js en PATH" -ForegroundColor Green
}

# 4. Verificar que Node.js está desinstalado
Write-Host "`n4. Verificando desinstalación..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "   ⚠️  ADVERTENCIA: Node.js todavía está instalado: $nodeVersion" -ForegroundColor Red
        Write-Host "   Reinicia el terminal o la computadora y vuelve a ejecutar este script" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✓ Node.js parece estar desinstalado" -ForegroundColor Green
}

Write-Host "`n=== Desinstalación completada ===" -ForegroundColor Green
Write-Host "Ahora puedes proceder a instalar Node.js desde nodejs.org" -ForegroundColor Cyan

