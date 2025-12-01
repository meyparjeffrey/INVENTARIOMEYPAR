# Script de configuración inicial para usuario JEFFREYAPP
# Ejecutar como: powershell -ExecutionPolicy Bypass -File scripts/setup-user.ps1

Write-Host "=== Configuración para usuario JEFFREYAPP ===" -ForegroundColor Cyan

# Verificar usuario actual
$currentUser = $env:USERNAME
Write-Host "Usuario actual: $currentUser" -ForegroundColor Yellow

if ($currentUser -ne "JEFFREYAPP") {
    Write-Host "⚠️  ADVERTENCIA: No estás ejecutando como usuario JEFFREYAPP" -ForegroundColor Red
    Write-Host "Usuario detectado: $currentUser" -ForegroundColor Yellow
    $continue = Read-Host "¿Continuar de todas formas? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit 1
    }
}

# Crear directorios de npm si no existen
Write-Host "`n=== Configurando directorios de npm ===" -ForegroundColor Cyan
$npmCache = "C:\npm-cache"
$npmGlobal = "C:\npm-global"
$npmTmp = "C:\npm-tmp"

@($npmCache, $npmGlobal, $npmTmp) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "✓ Creado: $_" -ForegroundColor Green
    } else {
        Write-Host "✓ Ya existe: $_" -ForegroundColor Gray
    }
}

# Configurar npm para usar estos directorios
Write-Host "`n=== Configurando npm ===" -ForegroundColor Cyan
npm config set cache $npmCache --global
npm config set prefix $npmGlobal --global
npm config set tmp $npmTmp --global

# Verificar configuración
Write-Host "`n=== Configuración actual de npm ===" -ForegroundColor Cyan
Write-Host "Caché: $(npm config get cache)"
Write-Host "Prefijo: $(npm config get prefix)"
Write-Host "Tmp: $(npm config get tmp)"

# Limpiar caché antigua
Write-Host "`n=== Limpiando caché de npm ===" -ForegroundColor Cyan
npm cache clean --force

# Verificar variables de entorno
Write-Host "`n=== Variables de entorno ===" -ForegroundColor Cyan
Write-Host "USERNAME: $env:USERNAME"
Write-Host "USERPROFILE: $env:USERPROFILE"
Write-Host "APPDATA: $env:APPDATA"

# Verificar que no haya caracteres especiales problemáticos
if ($env:USERNAME -like "*ñ*" -or $env:USERPROFILE -like "*ñ*" -or $env:APPDATA -like "*ñ*") {
    Write-Host "`n⚠️  ADVERTENCIA: Se detectó caracter especial 'ñ' en variables de entorno" -ForegroundColor Red
    Write-Host "Esto puede causar problemas. Considera usar el usuario JEFFREYAPP" -ForegroundColor Yellow
} else {
    Write-Host "`n✓ No se detectaron caracteres especiales problemáticos" -ForegroundColor Green
}

# Crear directorios del proyecto
Write-Host "`n=== Creando directorios del proyecto ===" -ForegroundColor Cyan
$projectDirs = @("logs", ".electron-user-data")
$projectDirs | ForEach-Object {
    $dirPath = Join-Path $PSScriptRoot ".." $_
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        Write-Host "✓ Creado: $dirPath" -ForegroundColor Green
    } else {
        Write-Host "✓ Ya existe: $dirPath" -ForegroundColor Gray
    }
}

Write-Host "`n=== Configuración completada ===" -ForegroundColor Green
Write-Host "Ahora puedes ejecutar: npm run dev" -ForegroundColor Cyan

