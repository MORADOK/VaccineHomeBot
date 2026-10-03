// Electron main process (CommonJS by design)
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const autoUpdater = require('./auto-updater.cjs');

let mainWindow = null;
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

if (process.platform === 'win32') app.setAppUserModelId('com.vchomehospital.vaccine-app');

function iconForPlatform() {
  if (process.platform === 'win32') return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'win', 'app.ico');
  if (process.platform === 'darwin') return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'mac', 'app.icns');
  return path.join(__dirname, '..', 'electron', 'assets', 'icons', 'png', '512x512.png');
}

function productionHtmlPath() {
  // app.getAppPath() works for both app.asar and unpacked builds.
  return path.join(app.getAppPath(), 'dist-electron', 'index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 700,
    show: false,
    title: 'VCHome Hospital Management System',
    icon: iconForPlatform(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) {
    void mainWindow.loadURL('http://localhost:5173/#/staff-portal');
  } else {
    const htmlPath = productionHtmlPath();
    if (!fs.existsSync(htmlPath)) {
      dialog.showErrorBox('Application files missing', `Cannot find application UI:\n${htmlPath}`);
      app.quit();
      return;
    }
    void mainWindow.loadFile(htmlPath, { hash: '/staff-portal' }).catch((error) => {
      dialog.showErrorBox('Failed to load VCHome Hospital', error.message || String(error));
    });
  }
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' }; });
  contents.on('will-navigate', (event, navigationURL) => {
    if (navigationURL.startsWith('file://') || navigationURL.startsWith('data:')) return;
    let allowed = false;
    try {
      const origin = new URL(navigationURL).origin;
      allowed = isDev && ['http://localhost:5173','http://127.0.0.1:5173'].includes(origin);
    } catch (_) {}
    if (!allowed) { event.preventDefault(); void shell.openExternal(navigationURL); }
  });
});

app.on('certificate-error', (event, _contents, _url, _error, _certificate, callback) => {
  if (isDev) { event.preventDefault(); callback(true); } else callback(false);
});

async function checkForUpdatesManually() {
  if (isDev) {
    await dialog.showMessageBox(mainWindow, { type:'info', title:'Development Mode', message:'Auto-update is disabled in development mode', buttons:['OK'] });
    return;
  }
  const result = await autoUpdater.checkForUpdates();
  if (!result) {
    await dialog.showMessageBox(mainWindow, { type:'info', title:'Update Check', message:'Update check finished. See updater status/log for details.', buttons:['OK'] });
  }
}

function buildMenu() {
  const template = [
    { label:'File', submenu:[
      { label:'Refresh', accelerator:'CmdOrCtrl+R', click:()=>mainWindow?.reload() },
      { label:'Force Refresh', accelerator:'CmdOrCtrl+Shift+R', click:()=>mainWindow?.webContents.reloadIgnoringCache() },
      { type:'separator' }, { label:'Exit', click:()=>app.quit() }
    ]},
    { label:'View', submenu:[
      { role:'zoomIn' }, { role:'zoomOut' }, { role:'resetZoom' }, { type:'separator' }, { role:'togglefullscreen' }
    ]},
    { label:'Help', submenu:[
      { label:'Check for Updates...', click:()=>void checkForUpdatesManually() },
      { type:'separator' },
      { label:'About VCHome Hospital', click:()=>void dialog.showMessageBox(mainWindow,{type:'info',title:'About VCHome Hospital',message:'VCHome Hospital Management System',detail:`Version ${app.getVersion()}`,buttons:['OK']}) },
      { label:'System Information', click:()=>void dialog.showMessageBox(mainWindow,{type:'info',title:'System Information',message:'System Information',detail:`Platform: ${process.platform}\nArchitecture: ${process.arch}\nNode.js: ${process.version}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nMemory: ${Math.round(os.totalmem()/1024/1024/1024)} GB`,buttons:['OK']}) }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdater() {
  if (isDev) return;
  autoUpdater.setMainWindow(mainWindow);
  const manager = autoUpdater.getUpdateManager();
  ipcMain.on('check-for-updates', () => void autoUpdater.checkForUpdates());
  ipcMain.on('download-update', () => void autoUpdater.downloadUpdate());
  ipcMain.on('install-update', () => autoUpdater.quitAndInstall());
  ipcMain.on('install-now', () => { manager.setInstallChoice(true); autoUpdater.quitAndInstall(); });
  ipcMain.on('install-later', () => manager.setInstallChoice(false));
  ipcMain.handle('get-update-preferences', () => manager.getAllPreferences());
  ipcMain.handle('set-update-preference', (_e,key,value) => manager.setPreference(key,value));
  ipcMain.handle('get-update-state', () => manager.getState());
  ipcMain.handle('get-update-logs', () => manager.getLogs());
  ipcMain.handle('clear-update-logs', () => manager.clearLogs());
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.on('open-manual-download', () => autoUpdater.openManualDownload());

  const prefs = manager.getAllPreferences();
  if (prefs.checkOnStartup) setTimeout(() => void autoUpdater.checkForUpdates(), 3000);
  if (prefs.checkInterval > 0) setInterval(() => void autoUpdater.checkForUpdates(), prefs.checkInterval);
}

app.whenReady().then(() => { createWindow(); buildMenu(); setupAutoUpdater(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
