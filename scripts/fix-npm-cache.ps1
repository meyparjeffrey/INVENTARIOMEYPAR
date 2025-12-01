# Script para limpiar caché de npm y verificar variables de entorno
# Ejecutar como: powershell -ExecutionPolicy Bypass -File scripts/fix-npm-cache.ps1

Write-Host "=== Limpieza de caché de npm ===" -ForegroundColor Cyan

# Verificar usuario actual
$currentUser = $env:USERNAME
Write-Host "Usuario actual: $currentUser" -ForegroundColor Yellow

if ($currentUser -eq "JEFFREYAPP") {
    Write-Host "✓ Usuario correcto: JEFFREYAPP" -ForegroundColor Green
} else {
    Write-Host "⚠️  Usuario detectado: $currentUser (esperado: JEFFREYAPP)" -ForegroundColor Yellow
}

# Limpiar caché de npm
Write-Host "`nLimpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force

# Verificar variables de entorno
Write-Host "`n=== Variables de entorno del sistema ===" -ForegroundColor Cyan
Write-Host "USERNAME: $env:USERNAME"
Write-Host "USERPROFILE: $env:USERPROFILE"
Write-Host "APPDATA: $env:APPDATA"

# Verificar que no haya caracteres especiales problemáticos
if ($env:USERNAME -like "*ñ*" -or $env:USERPROFILE -like "*ñ*" -or $env:APPDATA -like "*ñ*") {
    Write-Host "`n⚠️  ADVERTENCIA: Se detectó caracter especial 'ñ' en variables de entorno" -ForegroundColor Red
    Write-Host "Esto puede causar problemas. Usa el usuario JEFFREYAPP" -ForegroundColor Yellow
} else {
    Write-Host "`n✓ No se detectaron caracteres especiales problemáticos" -ForegroundColor Green
}

Write-Host "`n=== Ubicación de caché de npm ===" -ForegroundColor Cyan
$npmCache = npm config get cache
Write-Host "Caché: $npmCache"

# Verificar que la caché no esté en ruta con caracteres especiales
if ($npmCache -like "*ñ*") {
    Write-Host "`n⚠️  ADVERTENCIA: La caché de npm está en una ruta con caracteres especiales" -ForegroundColor Red
    Write-Host "Ejecuta: scripts/setup-user.ps1 para reconfigurar" -ForegroundColor Yellow
} else {
    Write-Host "✓ Caché de npm configurada correctamente" -ForegroundColor Green
}

Write-Host "`n✓ Limpieza completada" -ForegroundColor Green

