import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const isDev = process.env.NODE_ENV === "development";

// Obtener __dirname equivalente en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear ventana de splash/loading
function createSplashWindow(): BrowserWindow {
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

  if (isDev) {
    // En desarrollo, cargar desde src
    splash.loadFile(path.join(__dirname, "splash.html"));
  } else {
    // En producción, cargar desde la ruta compilada
    const appPath = app.getAppPath();
    const splashPath = path.join(appPath, "dist", "main", "src", "main", "electron", "splash.html");
    
    if (existsSync(splashPath)) {
      splash.loadFile(splashPath);
    } else {
      // Fallback: intentar desde __dirname
      splash.loadFile(path.join(__dirname, "splash.html"));
    }
  }

  splash.center();
  return splash;
}

async function createWindow() {
  // Crear splash screen primero
  const splash = createSplashWindow();

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "ALMACÉN MEYPAR",
    show: false, // No mostrar hasta que esté listo
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Ocultar menú por defecto para UI más profesional
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Atajo de teclado para abrir DevTools (Ctrl+Shift+I o F12)
  const { globalShortcut } = await import("electron");
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    window.webContents.openDevTools();
  });
  globalShortcut.register("F12", () => {
    window.webContents.openDevTools();
  });

  if (isDev) {
    await window.loadURL("http://localhost:5173");
    // DevTools solo en desarrollo si es necesario (comentado para no abrir automáticamente)
    // window.webContents.openDevTools({ mode: "detach" });
  } else {
    // En producción, usar app.getAppPath() para obtener la ruta correcta del asar
    // El renderer está en dist/renderer/index.html desde la raíz del asar
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, "dist", "renderer", "index.html");
    
    console.log("🔍 Rutas de depuración:", {
      appPath,
      __dirname,
      indexPath,
      exists: existsSync(indexPath)
    });
    
    // DevTools removidas - usar F12 o Ctrl+Shift+I si es necesario
    
    // Manejar errores de carga
    window.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      console.error("❌ Error al cargar:", {
        errorCode,
        errorDescription,
        validatedURL,
        indexPath,
        appPath
      });
    });
    
    // Log cuando la página carga y mostrar ventana principal
    window.webContents.on("did-finish-load", () => {
      console.log("✅ Página cargada correctamente");
      // Esperar 5 segundos para que el splash se vea
      setTimeout(() => {
        splash.close();
        window.show();
        window.focus();
      }, 5000);
    });
    
    // Log errores de consola del renderer
    window.webContents.on("console-message", (event, level, message) => {
      console.log(`[Renderer ${level}]:`, message);
    });
    
    try {
      await window.loadFile(indexPath);
      console.log("✅ Archivo cargado:", indexPath);
    } catch (error) {
      console.error("❌ Error al cargar index.html:", error);
      splash.close();
      window.show();
      // Fallback: intentar con ruta relativa desde __dirname
      const fallbackPath = path.join(appPath, "dist", "renderer", "index.html");
      console.log("🔄 Intentando fallback:", fallbackPath);
      try {
        await window.loadFile(fallbackPath);
      } catch (err) {
        console.error("❌ Error en fallback:", err);
      }
    }
  }
}

app.whenReady().then(() => {
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

