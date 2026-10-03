const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Detect production mode
const isDev = process.env.NODE_ENV === 'development' || 
              process.defaultApp || 
              /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || 
              /[\\/]electron[\\/]/.test(process.execPath);

// Completely disable ALL console output
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;
process.stdout.write = noop;
process.stderr.write = noop;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      devTools: false // Always disable DevTools
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'default',
    title: 'VCHome Hospital Management System'
  });

  // Determine correct path for loading
  let startUrl;
  
  if (isDev) {
    startUrl = 'http://localhost:5173';
  } else {
    // Production: Check multiple possible paths
    const basePaths = [
      path.join(__dirname, '../dist-electron/index.html'),
      path.join(__dirname, '../../dist-electron/index.html'),
      path.join(process.resourcesPath, 'app.asar/dist-electron/index.html'),
      path.join(process.resourcesPath, 'dist-electron/index.html'),
      path.join(__dirname, '../app.asar/dist-electron/index.html'),
      path.join(process.cwd(), 'dist-electron/index.html')
    ];
    
    // Find first existing path
    for (const filePath of basePaths) {
      if (fs.existsSync(filePath)) {
        startUrl = `file://${filePath.replace(/\\/g, '/')}`;
        break;
      }
    }
    
    // Ultimate fallback
    if (!startUrl) {
      startUrl = `file://${basePaths[0].replace(/\\/g, '/')}`;
    }
  }
  
  mainWindow.loadURL(startUrl);

  // Silent error handling
  mainWindow.webContents.on('did-fail-load', () => {
    // Show simple error page
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <title>VCHome Hospital</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #333; margin: 0 0 10px; }
            p { color: #666; margin: 10px 0; }
            button {
              background: #667eea;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #5568d3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏥 VCHome Hospital</h1>
            <p>กำลังโหลดระบบ...</p>
            <p>หากไม่สามารถโหลดได้ กรุณาลองใหม่อีกครั้ง</p>
            <button onclick="location.reload()">โหลดใหม่</button>
          </div>
        </body>
      </html>
    `);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
    
    if (!allowedOrigins.includes(parsedUrl.origin) && !navigationUrl.startsWith('file://') && !navigationUrl.startsWith('data:')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => {
          const zoom = mainWindow.webContents.getZoomFactor();
          mainWindow.webContents.setZoomFactor(Math.min(zoom + 0.1, 3.0));
        }},
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {
          const zoom = mainWindow.webContents.getZoomFactor();
          mainWindow.webContents.setZoomFactor(Math.max(zoom - 0.1, 0.5));
        }},
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => {
          mainWindow.webContents.setZoomFactor(1.0);
        }},
        { type: 'separator' },
        { label: 'Fullscreen', accelerator: 'F11', click: () => {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }}
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'VCHome Hospital Management System',
              detail: 'Version 1.0.0\n\nVaccine management system for healthcare providers.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vchomehospital.vaccine-app');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Security handlers
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});