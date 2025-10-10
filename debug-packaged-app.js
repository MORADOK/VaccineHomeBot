const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    },
    show: false
  });

  // Force packaged mode for testing
  const isPackaged = true;
  
  console.log('=== Debug Packaged App ===');
  console.log('Forced isPackaged:', isPackaged);
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('app.getAppPath():', app.getAppPath());

  // Test paths like in packaged app
  const possiblePaths = [
    // Path when running from app.asar
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'index.html'),
    // Path when running unpacked
    path.join(__dirname, '..', 'dist-electron', 'index.html'),
    // Alternative unpacked path
    path.join(app.getAppPath(), 'dist-electron', 'index.html'),
    // Fallback to resources
    path.join(process.resourcesPath, 'dist-electron', 'index.html'),
    // Direct path to our dist-electron
    path.join(__dirname, 'dist-electron', 'index.html')
  ];
  
  console.log('\\nTrying paths:');
  let foundPath = null;
  
  for (const filePath of possiblePaths) {
    const exists = fs.existsSync(filePath);
    console.log('  -', filePath, ':', exists ? 'EXISTS' : 'NOT FOUND');
    if (exists && !foundPath) {
      foundPath = filePath;
    }
  }
  
  let startUrl;
  if (foundPath) {
    startUrl = \`file://\${foundPath.replace(/\\\\/g, '/')}\`;
    console.log('\\n✅ Loading from:', foundPath);
    console.log('Final URL:', startUrl);
  } else {
    console.log('\\n❌ No index.html found!');
    startUrl = 'data:text/html;charset=utf-8,<h1>No index.html found!</h1>';
  }

  mainWindow.loadURL(startUrl);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('\\n❌ Failed to load:', errorDescription, validatedURL);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});