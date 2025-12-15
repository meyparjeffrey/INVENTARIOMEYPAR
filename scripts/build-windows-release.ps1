$ErrorActionPreference = 'Stop'

function Write-Step($msg) {
  Write-Host "==> $msg"
}

Write-Step 'Build Windows (Release) - INVENTARI MEYPAR'

# 1) Limpiar caché winCodeSign (evita fallos por extracción anterior incompleta)
$winCodeSignCache = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\winCodeSign'
if (Test-Path $winCodeSignCache) {
  Write-Step "Limpiando caché: $winCodeSignCache"
  Remove-Item -Recurse -Force $winCodeSignCache
}

# 2) Generar icon.ico válido (a partir de SVG)
Write-Step 'Generando build/icon.ico'
node scripts\generate-win-icon.cjs

# 3) Build del código (renderer + electron)
Write-Step 'Compilando (npm run build)'
npm run build

# 4) Empaquetado NSIS
Write-Step 'Empaquetando instalador (NSIS)'
node scripts\build-win.cjs

Write-Step 'OK: build finalizado. Revisa la carpeta release/.'
