// public/electron-final-fix.js
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

let mainWindow;

// ปรับปรุงการตรวจสอบ isDev ให้รองรับทั้ง NODE_ENV และ electron-is-dev
let isDev;
try {
  const electronIsDev = require('electron-is-dev');
  // ใช้ NODE_ENV override ถ้ามีการตั้งค่า
  isDev = process.env.NODE_ENV === 'production' ? false : electronIsDev;
} catch (error) {
  // ถ้า require electron-is-dev ไม่ได้ ให้ดูจาก NODE_ENV หรือตรวจสอบว่า packaged หรือไม่
  isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
}

console.log('[Electron] Running in mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
console.log('[Electron] NODE_ENV:', process.env.NODE_ENV);
console.log('[Electron] isPackaged:', app.isPackaged);

// ตั้ง AppUserModelID ให้เร็วที่สุด และต้อง "ตรงกับ" build.appId
if (process.platform === 'win32') {
  app.setAppUserModelId('com.vchomehospital.vaccine-app');
}

// ล็อกไม่ให้เปิดหลายอินสแตนซ์ (disabled for debugging)
// const gotTheLock = app.requestSingleInstanceLock();
// if (!gotTheLock) {
//   app.quit();
// } else {
//   app.on('second-instance', () => {
//     if (mainWindow) {
//       if (mainWindow.isMinimized()) mainWindow.restore();
//       mainWindow.focus();
//     }
//   });
// }

function iconForPlatform() {
  if (process.platform === 'win32') {
    return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'win', 'app.ico'); // 256x256 multi-size
  } else if (process.platform === 'darwin') {
    return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'mac', 'app.icns');
  }
  return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'png', '512x512.png');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: true,  // แสดง window ทันที
    titleBarStyle: 'default',
    title: 'VCHome Hospital Management System',
    icon: iconForPlatform(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // เรนเดอเรอร์ถูก build ไปที่ dist-electron/
    const htmlPath = path.join(__dirname, '..', 'dist-electron', 'index.html');
    console.log('[Electron] Loading from:', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // Log all page load events for debugging
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[did-start-loading] Page started loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[did-finish-load] Page loaded successfully');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[dom-ready] DOM is ready');
  });

  // รอ dev server: แสดงหน้า loading สั้น ๆ
  mainWindow.webContents.on('did-fail-load', (event, code, desc, url) => {
    const transient = new Set([-102, -105, -106, -118]);
    if (isDev && transient.has(code)) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Loading VCHome Hospital</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;background:#f5f5f5;">
            <h1>🏥 VCHome Hospital</h1>
            <p>Starting development server...</p>
            <p>Please wait a moment...</p>
            <script>setTimeout(()=>location.reload(),3000)</script>
          </body>
        </html>
      `);
    } else {
      console.error('[did-fail-load]', code, desc, url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // DevTools can be opened manually with F12 or Ctrl+Shift+I
    if (isDev && process.env.ELECTRON_DEBUG) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// รวมกฎลิงก์ภายนอก/การนำทางไว้ที่เดียว
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (e, navigationURL) => {
    const url = new URL(navigationURL);
    const allowed = new Set([
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]);
    const isFile = navigationURL.startsWith('file://');
    const isData = navigationURL.startsWith('data:');

    if (!isFile && !isData && !allowed.has(url.origin)) {
      e.preventDefault();
      shell.openExternal(navigationURL);
    }
  });
});

// ใบรับรอง dev เท่านั้น
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Force Refresh', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Exit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => {
          const z = mainWindow?.webContents.getZoomFactor() ?? 1;
          mainWindow?.webContents.setZoomFactor(Math.min(z + 0.1, 3));
        }},
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {
          const z = mainWindow?.webContents.getZoomFactor() ?? 1;
          mainWindow?.webContents.setZoomFactor(Math.max(z - 0.1, 0.5));
        }},
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomFactor(1) },
        { type: 'separator' },
        { label: 'Fullscreen', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow?.isFullScreen()) }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize', accelerator: 'CmdOrCtrl+M' },
        { role: 'close', label: 'Close', accelerator: 'CmdOrCtrl+W' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About VCHome Hospital',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About VCHome Hospital',
              message: 'VCHome Hospital Management System',
              detail: 'Version 1.0.0\n\nA comprehensive vaccine management system for healthcare providers.\n\nDeveloped with ❤️ for VCHome Hospital',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'System Information',
          click: () => {
            const os = require('os');
            const info = `
Platform: ${process.platform}
Architecture: ${process.arch}
Node.js: ${process.version}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB
            `.trim();
            dialog.showMessageBox(mainWindow, { type: 'info', title: 'System Information', message: 'System Information', detail: info, buttons: ['OK'] });
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'About ' + app.getName() },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + app.getName() },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
