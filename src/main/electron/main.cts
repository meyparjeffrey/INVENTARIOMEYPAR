/**
 * Proceso principal de Electron para ALMACÉN MEYPAR
 * 
 * En producción, este archivo se ejecuta empaquetado dentro del asar de Electron,
 * donde require('electron') funciona correctamente con el módulo interno de Electron.
 */

const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const { existsSync } = require('fs');

const isDev = process.env.NODE_ENV === "development";

// Crear ventana de splash/loading
function createSplashWindow() {
    const splash = new BrowserWindow({
        width: 500,
        height: 400,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // En producción, cargar desde la ruta compilada
    const appPath = app.getAppPath();
    const splashPath = path.join(appPath, "dist", "main", "src", "main", "electron", "splash.html");

    if (existsSync(splashPath)) {
        splash.loadFile(splashPath);
    } else {
        // Fallback: intentar desde __dirname
        splash.loadFile(path.join(__dirname, "splash.html"));
    }

    splash.center();
    return splash;
}

async function createWindow() {
    // Crear splash screen primero
    const splash = createSplashWindow();

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 680,
        title: "ALMACÉN MEYPAR",
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Ocultar menú por defecto para UI más profesional
    Menu.setApplicationMenu(null);

    // Atajo de teclado para abrir DevTools (Ctrl+Shift+I o F12)
    globalShortcut.register("CommandOrControl+Shift+I", () => {
        win.webContents.openDevTools();
    });
    globalShortcut.register("F12", () => {
        win.webContents.openDevTools();
    });

    // En producción, usar app.getAppPath() para obtener la ruta correcta del asar
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, "dist", "renderer", "index.html");

    // eslint-disable-next-line no-console
    console.log("🔍 Rutas de depuración:", {
        appPath,
        __dirname,
        indexPath,
        exists: existsSync(indexPath)
    });

    // Manejar errores de carga
    win.webContents.on("did-fail-load", (_event: any, errorCode: any, errorDescription: any, validatedURL: any) => {
        // eslint-disable-next-line no-console
        console.error("❌ Error al cargar:", {
            errorCode,
            errorDescription,
            validatedURL,
            indexPath,
            appPath
        });
    });

    // Log cuando la página carga y mostrar ventana principal
    win.webContents.on("did-finish-load", () => {
        // eslint-disable-next-line no-console
        console.log("✅ Página cargada correctamente");
        // Esperar 3 segundos para que el splash se vea
        setTimeout(() => {
            splash.close();
            win.show();
            win.focus();
        }, 3000);
    });

    // Log errores de consola del renderer
    win.webContents.on("console-message", (_event: any, level: any, message: any) => {
        // eslint-disable-next-line no-console
        console.log(`[Renderer ${level}]:`, message);
    });

    try {
        await win.loadFile(indexPath);
        // eslint-disable-next-line no-console
        console.log("✅ Archivo cargado:", indexPath);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("❌ Error al cargar index.html:", error);
        splash.close();
        win.show();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
