const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Load environment variables for Electron
if (isDev) {
  require('dotenv').config();
}

// Hide console in production
if (!isDev) {
  // Redirect console output to prevent console window
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

let mainWindow;
let userOpenedDevTools = false;
let devToolsCloseInterval = null;

function createWindow() {
  // Create the browser window
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
      devTools: isDev // Only allow DevTools in development, but don't auto-open
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false,
    titleBarStyle: 'default',
    title: 'VCHome Hospital Management System'
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:5173'  // Vite default port
    : `file://${path.join(__dirname, '../dist-electron/index.html')}`;  // Electron-specific build output
  
  mainWindow.loadURL(startUrl);

  // Add error handling for loading
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('Failed to load:', errorDescription, validatedURL);
    
    // If dev server isn't ready, show loading page
    if (isDev && errorCode === -102) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Loading VCHome Hospital</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
            <h1>🏥 VCHome Hospital</h1>
            <p>Starting development server...</p>
            <p>Please wait a moment...</p>
            <script>
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
  });

  // Close DevTools on DOM ready
  mainWindow.webContents.on('dom-ready', () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      console.log('[DevTools] Closed on DOM ready');
    }
  });

  // AGGRESSIVE: Force close DevTools immediately whenever it opens
  mainWindow.webContents.on('devtools-opened', () => {
    if (!userOpenedDevTools) {
      // Immediately close if not opened by user
      mainWindow.webContents.closeDevTools();
      console.log('[DevTools] Auto-open blocked immediately');
    } else {
      console.log('[DevTools] Opened manually by user - allowing');
    }
  });

  // Force close DevTools when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    // Close DevTools immediately on load (no setTimeout)
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      console.log('[DevTools] Closed on page load');
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    // Close BEFORE showing window
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    }

    mainWindow.show();

    // Force close DevTools on startup (multiple checks)
    const forceClose = () => {
      if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
        console.log('[DevTools] Force closed on startup');
      }
    };

    forceClose();
    setImmediate(forceClose);
    setTimeout(forceClose, 0);
    setTimeout(forceClose, 10);
    setTimeout(forceClose, 50);
    setTimeout(forceClose, 100);
    setTimeout(forceClose, 200);
    setTimeout(forceClose, 500);

    // ULTIMATE SOLUTION: Continuously check and close DevTools every 100ms
    // This ensures DevTools stays closed unless manually opened by user
    if (devToolsCloseInterval) {
      clearInterval(devToolsCloseInterval);
    }

    devToolsCloseInterval = setInterval(() => {
      if (mainWindow && !userOpenedDevTools) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
          console.log('[DevTools] Interval check - force closed');
        }
      }
    }, 100); // Check every 100ms
  });

  // Track manual DevTools toggle via keyboard
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      userOpenedDevTools = true;
      // Keep flag true for 2 seconds to allow DevTools to fully open
      setTimeout(() => { userOpenedDevTools = false; }, 2000);
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    if (devToolsCloseInterval) {
      clearInterval(devToolsCloseInterval);
      devToolsCloseInterval = null;
    }
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow localhost development servers and file:// protocol
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative dev server
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    if (!allowedOrigins.includes(parsedUrl.origin) && !navigationUrl.startsWith('file://') && !navigationUrl.startsWith('data:')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Refresh',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            // Set flag to allow opening
            userOpenedDevTools = true;
            mainWindow.webContents.toggleDevTools();
            // Keep flag true for 2 seconds to allow DevTools to fully open
            setTimeout(() => { userOpenedDevTools = false; }, 2000);
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 3.0));
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomFactor(1.0);
          }
        },
        { type: 'separator' },
        {
          label: 'Fullscreen',
          accelerator: 'F11',
          click: () => {
            const isFullScreen = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFullScreen);
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.minimize();
          }
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        }
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
            
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'System Information',
              message: 'System Information',
              detail: info,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vchomehospital.vaccine-app');
  }
});

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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Prevent navigation to external sites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationURL) => {
    const parsedUrl = new URL(navigationURL);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    if (!allowedOrigins.includes(parsedUrl.origin) && !navigationURL.startsWith('file://') && !navigationURL.startsWith('data:')) {
      navigationEvent.preventDefault();
    }
  });
});

// Handle app updates (placeholder for future implementation)
if (!isDev) {
  // Auto-updater logic can be added here
  console.log('Production mode - Auto-updater can be configured here');
}