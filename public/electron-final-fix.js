const { autoUpdater } = require('electron-updater');
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
    // Development mode: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173/#/staff-portal');
  } else {
    // Production mode: Load built files and navigate to staff portal
    const htmlPath = path.join(__dirname, '..', 'dist-electron', 'index.html');
    console.log('[Electron] Loading from:', htmlPath);

    // Load the HTML file first
    mainWindow.loadFile(htmlPath).then(() => {
      // Then navigate to staff portal using hash navigation
      mainWindow.webContents.executeJavaScript(`
        window.location.hash = '#/staff-portal';
      `);
      console.log('[Electron] Navigated to Staff Portal');
    }).catch(err => {
      console.error('[Electron] Failed to load or navigate:', err);
    });
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
    // เปิด DevTools เฉพาะเมื่อมี environment variable ELECTRON_DEBUG=true
    if ((isDev || !app.isPackaged) && process.env.ELECTRON_DEBUG === 'true') {
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

// Flag สำหรับเช็คว่าเป็น manual check หรือไม่
let isManualCheck = false;

// ฟังก์ชันสำหรับตรวจสอบ update แบบ manual (เรียกจาก menu)
function checkForUpdatesManually() {
  if (isDev) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Development Mode',
      message: 'Auto-update is disabled in development mode',
      buttons: ['OK']
    });
    return;
  }

  // ตั้ง flag ว่าเป็น manual check
  isManualCheck = true;

  console.log('[updater] Manual update check initiated by user');

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('[updater] Manual check error:', error);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Check Failed',
      message: 'Failed to check for updates',
      detail: error.message || 'Please check your internet connection and try again.',
      buttons: ['OK']
    });
    isManualCheck = false;
  });
}

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
          label: 'Check for Updates...',
          click: checkForUpdatesManually
        },
        { type: 'separator' },
        {
          label: 'About VCHome Hospital',
          click: () => {
            const appVersion = app.getVersion();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About VCHome Hospital',
              message: 'VCHome Hospital Management System',
              detail: `Version ${appVersion}\n\nA comprehensive vaccine management system for healthcare providers.\n\nDeveloped with ❤️ for VCHome Hospital`,
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

// ฟังก์ชันสำหรับจัดการ Auto-Update
function setupAutoUpdater() {
  if (isDev) {
    console.log('[updater] Auto-update disabled in development mode');
    return;
  }

  // ตั้งค่าการดาวน์โหลดและติดตั้งอัตโนมัติ
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // เมื่อเริ่มตรวจสอบ update
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for updates...');
    if (isManualCheck) {
      console.log('[updater] Manual check in progress...');
    }
  });

  // เมื่อตรวจพบ update ใหม่
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update available:', info.version);
    const currentVersion = app.getVersion();

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version ${info.version} is available!`,
      detail: `Current version: ${currentVersion}\nNew version: ${info.version}\n\nThe update will be downloaded in the background.\nYou will be notified when it is ready to install.`,
      buttons: ['OK']
    });

    // รีเซ็ต flag
    isManualCheck = false;
  });

  // เมื่อไม่มี update
  autoUpdater.on('update-not-available', (info) => {
    const currentVersion = app.getVersion();
    console.log('[updater] No updates available. Current version:', currentVersion);

    // แสดง dialog เฉพาะเมื่อเป็น manual check
    if (isManualCheck) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No Updates Available',
        message: 'You are using the latest version!',
        detail: `Current version: ${currentVersion}\n\nYour application is up to date.`,
        buttons: ['OK']
      });

      // รีเซ็ต flag
      isManualCheck = false;
    }
  });

  // เมื่อเกิด error ในการตรวจสอบหรือดาวน์โหลด
  autoUpdater.on('error', (error) => {
    console.error('[updater] Error:', error);

    // แสดง error dialog เฉพาะเมื่อเป็น manual check
    if (isManualCheck) {
      let errorMessage = 'Failed to check for updates';
      let errorDetail = error.message || 'Unknown error occurred';

      // ปรับข้อความตาม error type
      if (error.message && error.message.includes('ERR_UPDATER_LATEST_VERSION_NOT_FOUND')) {
        errorMessage = 'No release found';
        errorDetail = 'No published releases found on GitHub.\n\nPlease contact the administrator to publish a release.';
      } else if (error.message && error.message.includes('ENOENT')) {
        errorMessage = 'Update files not found';
        errorDetail = 'Cannot find update information files (latest.yml).\n\nPlease ensure releases are properly published.';
      } else if (error.message && (error.message.includes('net::') || error.message.includes('ENOTFOUND'))) {
        errorMessage = 'Network error';
        errorDetail = 'Cannot connect to update server.\n\nPlease check your internet connection and try again.';
      }

      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Update Check Failed',
        message: errorMessage,
        detail: errorDetail,
        buttons: ['OK']
      });

      // รีเซ็ต flag
      isManualCheck = false;
    }
  });

  // แสดงความคืบหน้าการดาวน์โหลด
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`[updater] Download progress: ${percent}% (${progress.transferred}/${progress.total} bytes)`);

    // อัพเดท title bar เพื่อแสดง progress
    if (mainWindow) {
      mainWindow.setTitle(`VCHome Hospital - Downloading update: ${percent}%`);
    }
  });

  // เมื่อดาวน์โหลดเสร็จ - ถามผู้ใช้ว่าจะ restart ติดตั้งเลยหรือไม่
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Update downloaded:', info.version);

    // รีเซ็ต title bar
    if (mainWindow) {
      mainWindow.setTitle('VCHome Hospital Management System');
    }

    // แสดง dialog ให้ผู้ใช้เลือก
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'The application will restart to install the update.\n\nClick "Restart Now" to install immediately, or "Later" to install when you close the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        // ผู้ใช้เลือก Restart Now
        console.log('[updater] User chose to restart now');
        autoUpdater.quitAndInstall();
      } else {
        // ผู้ใช้เลือก Later - จะติดตั้งเมื่อปิดแอป
        console.log('[updater] Update will be installed on next restart');
      }
    });
  });

  // ตรวจสอบ update ทันทีเมื่อเปิดแอป
  console.log('[updater] Starting initial update check...');
  autoUpdater.checkForUpdatesAndNotify();

  // ตรวจสอบ update ทุก 4 ชั่วโมง
  setInterval(() => {
    console.log('[updater] Running periodic update check...');
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  setupAutoUpdater();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
