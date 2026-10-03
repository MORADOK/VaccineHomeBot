const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Force production mode for testing
const isDev = false;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: true // Enable for debugging
    },
    show: false,
    title: 'VCHome Hospital - Debug Mode'
  });

  // Try to find the correct path
  console.log('=== DEBUG INFO ===');
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('process.cwd():', process.cwd());
  
  const possiblePaths = [
    path.join(__dirname, '../dist-electron/index.html'),
    path.join(__dirname, '../../dist-electron/index.html'),
    path.join(process.resourcesPath, 'dist-electron/index.html'),
    path.join(__dirname, '../app.asar/dist-electron/index.html'),
    path.join(process.cwd(), 'dist-electron/index.html')
  ];
  
  console.log('\n=== CHECKING PATHS ===');
  let startUrl = null;
  for (const filePath of possiblePaths) {
    const exists = fs.existsSync(filePath);
    console.log(`${exists ? '✅' : '❌'} ${filePath}`);
    if (exists && !startUrl) {
      startUrl = `file://${filePath}`;
    }
  }
  
  if (!startUrl) {
    console.log('\n❌ NO VALID PATH FOUND!');
    startUrl = `file://${possiblePaths[0]}`;
  }
  
  console.log('\n=== LOADING ===');
  console.log('Final URL:', startUrl);
  
  mainWindow.loadURL(startUrl);

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window shown');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('\n❌ LOAD FAILED:');
    console.log('Error Code:', errorCode);
    console.log('Description:', errorDescription);
    console.log('URL:', validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 Starting Electron in DEBUG mode...');
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
