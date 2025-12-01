# Script para eliminar referencias al usuario anterior del PATH del sistema
# Ejecutar como ADMINISTRADOR

Write-Host "=== Limpieza de PATH del sistema ===" -ForegroundColor Cyan

# Obtener PATH actual del usuario
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
Write-Host "`nPATH del usuario actual:" -ForegroundColor Yellow
Write-Host $userPath

# Limpiar PATH del usuario
$cleanedUserPath = ($userPath -split ';' | Where-Object { 
    $_ -notlike "*JeffreyBolaños*" -and 
    $_ -notlike "*potrace*" -and 
    $_ -ne ""
}) -join ';'

if ($userPath -ne $cleanedUserPath) {
    Write-Host "`nEliminando referencias al usuario anterior del PATH del usuario..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable("PATH", $cleanedUserPath, "User")
    Write-Host "✓ PATH del usuario limpiado" -ForegroundColor Green
} else {
    Write-Host "`n✓ PATH del usuario ya está limpio" -ForegroundColor Green
}

# Verificar PATH del sistema (Machine)
$machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$cleanedMachinePath = ($machinePath -split ';' | Where-Object { 
    $_ -notlike "*JeffreyBolaños*" -and 
    $_ -notlike "*potrace*" -and 
    $_ -ne ""
}) -join ';'

if ($machinePath -ne $cleanedMachinePath) {
    Write-Host "`nEliminando referencias al usuario anterior del PATH del sistema..." -ForegroundColor Yellow
    [System.Environment]::SetEnvironmentVariable("PATH", $cleanedMachinePath, "Machine")
    Write-Host "✓ PATH del sistema limpiado" -ForegroundColor Green
} else {
    Write-Host "`n✓ PATH del sistema ya está limpio" -ForegroundColor Green
}

Write-Host "`n=== Limpieza completada ===" -ForegroundColor Green
Write-Host "IMPORTANTE: Cierra y vuelve a abrir PowerShell para que los cambios surtan efecto" -ForegroundColor Yellow


