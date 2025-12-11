// Script para ejecutar Electron en desarrollo renombrando temporalmente node_modules/electron
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const nodeModulesElectron = path.join(projectRoot, 'node_modules', 'electron');
const nodeModulesElectronBak = path.join(projectRoot, 'node_modules', 'electron.bak');
const electronExe = path.join(nodeModulesElectronBak, 'dist', 'electron.exe');
const mainPath = path.join(projectRoot, 'dist', 'main', 'src', 'main', 'electron', 'main.cjs');

// Verificar que existe node_modules/electron
if (!fs.existsSync(nodeModulesElectron)) {
    console.error('ERROR: node_modules/electron no existe');
    process.exit(1);
}

// Renombrar temporalmente
console.log('🔄 Renombrando node_modules/electron a node_modules/electron.bak...');
try {
    fs.renameSync(nodeModulesElectron, nodeModulesElectronBak);
} catch (e) {
    console.error('ERROR al renombrar:', e.message);
    process.exit(1);
}

// Ejecutar Electron
console.log('🚀 Ejecutando Electron...');
const electron = spawn(electronExe, [mainPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

// Restaurar al terminar
function restore() {
    console.log('\n🔄 Restaurando node_modules/electron...');
    try {
        if (fs.existsSync(nodeModulesElectronBak)) {
            fs.renameSync(nodeModulesElectronBak, nodeModulesElectron);
            console.log('✅ Restaurado correctamente');
        }
    } catch (e) {
        console.error('ERROR al restaurar:', e.message);
    }
}

electron.on('close', (code) => {
    restore();
    process.exit(code || 0);
});

process.on('SIGINT', () => {
    restore();
    process.exit(0);
});

process.on('SIGTERM', () => {
    restore();
    process.exit(0);
});
