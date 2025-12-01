# Script para ejecutar el proyecto en desarrollo
# Ejecutar como: powershell -ExecutionPolicy Bypass -File scripts/run-dev.ps1

Write-Host "=== Iniciando proyecto en modo desarrollo ===" -ForegroundColor Cyan

# Verificar usuario
$currentUser = $env:USERNAME
if ($currentUser -ne "JEFFREYAPP") {
    Write-Host "⚠️  ADVERTENCIA: Usuario actual: $currentUser (esperado: JEFFREYAPP)" -ForegroundColor Yellow
    Write-Host "Esto puede causar problemas con caracteres especiales en rutas" -ForegroundColor Yellow
}

# Verificar que existe .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  ADVERTENCIA: No se encontró .env.local" -ForegroundColor Yellow
    Write-Host "Crea el archivo .env.local con las credenciales de Supabase" -ForegroundColor Yellow
    Write-Host "Puedes copiar desde: Docs/env.example" -ForegroundColor Yellow
    $continue = Read-Host "¿Continuar de todas formas? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit 1
    }
}

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Ejecutar proyecto
Write-Host "`nIniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener`n" -ForegroundColor Gray

npm run dev

