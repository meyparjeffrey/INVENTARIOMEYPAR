/**
 * Proceso principal de Electron para ALMACÉN MEYPAR
 *
 * En producción, este archivo se ejecuta empaquetado dentro del asar de Electron,
 * donde require('electron') funciona correctamente con el módulo interno de Electron.
 */

const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const { existsSync } = require('fs');

const isDev = process.env.NODE_ENV === 'development';
// electron-builder portable define esta env var al arrancar el exe portable.
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
// Modo DevTools para depurar en PCs (sin instalador).
const devToolsEnabled = isDev || isPortable || process.env.INVENTARIO_DEVTOOLS === '1';

function setupAppMenu(win: any) {
  if (!devToolsEnabled) {
    // UI más profesional (sin menú) en builds normales.
    Menu.setApplicationMenu(null);
    return;
  }

  // Menú mínimo para soporte/diagnóstico (portable/dev).
  const template = [
    {
      label: 'Herramientas',
      submenu: [
        {
          label: 'Abrir DevTools',
          accelerator: 'F12',
          click: () => win.webContents.openDevTools({ mode: 'detach' }),
        },
        {
          label: 'Recargar',
          accelerator: 'CommandOrControl+R',
          click: () => win.webContents.reload(),
        },
        {
          label: 'Forzar recarga',
          accelerator: 'CommandOrControl+Shift+R',
          click: () => win.webContents.reloadIgnoringCache(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Obtiene la ruta del icono de la app para Windows.
 *
 * Objetivo: evitar que Windows muestre el icono por defecto de Electron en:
 * - Barra de tareas / título de ventana
 * - Búsqueda del menú Inicio (cuando la AppUserModelId coincide)
 *
 * En build, `electron-builder` copia `build/icon.ico` a `resources/icon.ico`
 * mediante `extraResources` (configurado en `package.json`).
 */
function getAppIconPath(): string | null {
  // `resourcesPath` existe en Electron, pero no está en los typings estándar de Node.
  // Lo leemos de forma segura para no romper el build TypeScript.
  const resourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath;

  const candidates: string[] = [
    // En producción empaquetada: resources/icon.ico
    ...(resourcesPath ? [path.join(resourcesPath, 'icon.ico')] : []),
    // En desarrollo: build/icon.ico en raíz del proyecto
    path.join(process.cwd(), 'build', 'icon.ico'),
    // Fallback adicional (por si el cwd no es el root)
    path.join(__dirname, '..', '..', '..', 'build', 'icon.ico'),
  ];

  const found = candidates.find((p) => existsSync(p));
  return found ?? null;
}

// Crear ventana de splash/loading
function createSplashWindow() {
  const iconPath = getAppIconPath();
  const splash = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // En producción, cargar desde la ruta compilada
  const appPath = app.getAppPath();
  const splashPath = path.join(
    appPath,
    'dist',
    'main',
    'src',
    'main',
    'electron',
    'splash.html',
  );

  if (existsSync(splashPath)) {
    splash.loadFile(splashPath);
  } else {
    // Fallback: intentar desde __dirname
    splash.loadFile(path.join(__dirname, 'splash.html'));
  }

  splash.center();
  return splash;
}

async function createWindow() {
  // Crear splash screen primero
  const splash = createSplashWindow();

  // En Windows, esta línea ayuda a que el sistema asocie correctamente el icono
  // con el acceso directo y la búsqueda del menú Inicio (evita icono genérico).
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.inventario.almacen');
  }

  const iconPath = getAppIconPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'INVENTARI MEYPAR',
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Menú: oculto en producción normal, visible en portable/dev para depurar
  setupAppMenu(win);

  // Atajos de teclado para abrir DevTools (Ctrl+Shift+I o F12) en modo debug/portable.
  if (devToolsEnabled) {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      win.webContents.openDevTools({ mode: 'detach' });
    });
    globalShortcut.register('F12', () => {
      win.webContents.openDevTools({ mode: 'detach' });
    });
  }

  // En producción, usar app.getAppPath() para obtener la ruta correcta del asar
  const appPath = app.getAppPath();
  const indexPath = path.join(appPath, 'dist', 'renderer', 'index.html');

  // eslint-disable-next-line no-console
  console.log('🔍 Rutas de depuración:', {
    appPath,
    __dirname,
    indexPath,
    exists: existsSync(indexPath),
  });

  // Manejar errores de carga
  win.webContents.on(
    'did-fail-load',
    (_event: any, errorCode: any, errorDescription: any, validatedURL: any) => {
      // eslint-disable-next-line no-console
      console.error('❌ Error al cargar:', {
        errorCode,
        errorDescription,
        validatedURL,
        indexPath,
        appPath,
      });
    },
  );

  // Log cuando la página carga y mostrar ventana principal
  win.webContents.on('did-finish-load', () => {
    // eslint-disable-next-line no-console
    console.log('✅ Página cargada correctamente');
    // Esperar 3 segundos para que el splash se vea
    setTimeout(() => {
      splash.close();
      win.show();
      win.focus();
      win.webContents.focus();

      // En portable/dev, abrir DevTools automáticamente para capturar logs (escáner HID).
      if (
        devToolsEnabled &&
        (isPortable || process.env.INVENTARIO_DEVTOOLS_AUTO === '1')
      ) {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    }, 3000);
  });

  // Log errores de consola del renderer
  win.webContents.on('console-message', (_event: any, level: any, message: any) => {
    // eslint-disable-next-line no-console
    console.log(`[Renderer ${level}]:`, message);
  });

  try {
    await win.loadFile(indexPath);
    // eslint-disable-next-line no-console
    console.log('✅ Archivo cargado:', indexPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error al cargar index.html:', error);
    splash.close();
    win.show();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
