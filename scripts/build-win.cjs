const builder = require('electron-builder');
const Platform = builder.Platform;

// Add scripts to path to ensure our signtool shim is picked up
const path = require('path');
process.env.PATH = path.join(__dirname) + ';' + process.env.PATH;
// Disable strict signing checks
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

console.log('🏗️  Iniciando build de producción (NSIS)...');

builder.build({
    targets: Platform.WINDOWS.createTarget(),
    config: {
        productName: "INVENTARI MEYPAR",
        npmRebuild: false,
        directories: {
            output: "release",
            buildResources: "build"
        },
        files: [
            "dist/**/*",
            "package.json",
            "!node_modules/**/*",
            "!src/**/*",
            "!configs/**/*",
            "!scripts/**/*",
            "!mcp-server/**/*",
            "!Docs/**/*",
            "!*.config.*",
            "!tsconfig*.json",
            "!vitest.config.ts"
        ],
        win: {
            target: [
                {
                    target: "nsis",
                    arch: ["x64"]
                }
            ],
            icon: "build/icon.ico",
            forceCodeSigning: false,
            verifyUpdateCodeSignature: false
        },
        nsis: {
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            allowElevation: true,
            createDesktopShortcut: "always",
            createStartMenuShortcut: true,
            shortcutName: "INVENTARI MEYPAR",
            deleteAppDataOnUninstall: false,
            runAfterFinish: true,
            menuCategory: false,
            warningsAsErrors: false,
            warningsAsErrors: false,
            installerLanguages: ["es_ES"]
        }
    }
})
    .then(() => {
        console.log('✅ Build completado exitosamente!');
    })
    .catch((error) => {
        console.error('❌ Error durante el build:', error);
        process.exit(1);
    });
