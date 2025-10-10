const { app, BrowserWindow } = require('electron');
const path = require('path');

// Force production mode
process.env.NODE_ENV = 'production';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    show: false,
    title: 'VCHome Hospital - Production Test'
  });

  // Load from dist-electron
  const indexPath = path.join(__dirname, 'dist-electron/index.html');
  console.log('Loading from:', indexPath);
  
  mainWindow.loadFile(indexPath);

  // Show DevTools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Electron app loaded successfully!');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log any errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]:`, message);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log('🚀 Starting Electron in production mode...');
console.log('📁 Loading from dist-electron folder');