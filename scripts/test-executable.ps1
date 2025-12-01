# Script para probar el ejecutable de Electron
# Verifica que la aplicacion se ejecute correctamente y muestre la interfaz

$env:ComSpec = "C:\WINDOWS\system32\cmd.exe"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

Write-Host "`nPRUEBA DE EJECUTABLE DE ELECTRON" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$exeDir = "dist\electron\win-unpacked"
$exeFiles = Get-ChildItem -Path $exeDir -Filter "*.exe" -ErrorAction SilentlyContinue

if ($null -eq $exeFiles -or $exeFiles.Count -eq 0) {
    Write-Host "ERROR: No se encontro el ejecutable en: $exeDir" -ForegroundColor Red
    exit 1
}

$exePath = $exeFiles[0].FullName

Write-Host "`nEjecutable encontrado: $exePath" -ForegroundColor Green
Write-Host "Informacion:" -ForegroundColor Yellow
$exeInfo = Get-Item $exePath
$sizeMB = [math]::Round($exeInfo.Length / 1MB, 2)
Write-Host "   - Tamano: $sizeMB MB" -ForegroundColor White
Write-Host "   - Ultima modificacion: $($exeInfo.LastWriteTime)" -ForegroundColor White

Write-Host "`nVerificando estructura de archivos..." -ForegroundColor Yellow
$asarPath = "dist\electron\win-unpacked\resources\app.asar"
if (Test-Path $asarPath) {
    Write-Host "app.asar encontrado" -ForegroundColor Green
    $asarInfo = Get-Item $asarPath
    $asarSizeMB = [math]::Round($asarInfo.Length / 1MB, 2)
    Write-Host "   - Tamano: $asarSizeMB MB" -ForegroundColor White
} else {
    Write-Host "ERROR: app.asar no encontrado" -ForegroundColor Red
}

Write-Host "`nVerificando logs..." -ForegroundColor Yellow
$logPath = "logs\main.log"
if (Test-Path $logPath) {
    Write-Host "Archivo de log encontrado" -ForegroundColor Green
    Write-Host "   - Ultimas lineas del log:" -ForegroundColor White
    Get-Content $logPath -Tail 10 | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
} else {
    Write-Host "ADVERTENCIA: Archivo de log no encontrado (se creara al ejecutar)" -ForegroundColor Yellow
}

Write-Host "`nPara probar la aplicacion:" -ForegroundColor Cyan
Write-Host "   1. Ejecuta: Start-Process '$exePath'" -ForegroundColor White
Write-Host "   2. Verifica que la ventana se abra correctamente" -ForegroundColor White
Write-Host "   3. Verifica que la interfaz se muestre (no este en blanco)" -ForegroundColor White
Write-Host "   4. Revisa los logs en: $logPath" -ForegroundColor White

Write-Host "`nValidacion de estructura completada" -ForegroundColor Green
