# VCHome Hospital Desktop App Setup Guide

## Option 1: Electron Desktop App (Recommended)

### Step 1: Install Electron Dependencies
```bash
npm install --save-dev electron electron-builder
npm install --save-dev concurrently wait-on
```

### Step 2: Create Electron Main Process
Create `public/electron.js`:
```javascript
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false,
    titleBarStyle: 'default'
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
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
            mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(currentZoom - 0.1);
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomFactor(1.0);
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
            // Show about dialog
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});
```

### Step 3: Update package.json
```json
{
  "main": "public/electron.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm start\" \"wait-on http://localhost:3000 && electron .\"",
    "electron-pack": "electron-builder",
    "preelectron-pack": "npm run build",
    "dist": "npm run build && electron-builder --publish=never",
    "dist-win": "npm run build && electron-builder --win --publish=never",
    "dist-mac": "npm run build && electron-builder --mac --publish=never",
    "dist-linux": "npm run build && electron-builder --linux --publish=never"
  },
  "build": {
    "appId": "com.vchomehospital.vaccine-app",
    "productName": "VCHome Hospital",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "node_modules/**/*",
      "public/electron.js"
    ],
    "mac": {
      "category": "public.app-category.medical"
    },
    "win": {
      "target": "nsis",
      "icon": "public/favicon.ico"
    },
    "linux": {
      "target": "AppImage"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Step 4: Install Additional Dependencies
```bash
npm install --save-dev electron-is-dev
```

### Step 5: Build and Run
```bash
# Development
npm run electron-dev

# Build for production
npm run dist-win    # Windows
npm run dist-mac    # macOS  
npm run dist-linux  # Linux
```

## Option 2: Tauri (Rust-based, Smaller Size)

### Step 1: Install Tauri
```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
```

### Step 2: Initialize Tauri
```bash
npx tauri init
```

### Step 3: Configure tauri.conf.json
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm start",
    "devPath": "http://localhost:3000",
    "distDir": "../build"
  },
  "package": {
    "productName": "VCHome Hospital",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.vchomehospital.vaccine-app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "VCHome Hospital",
        "width": 1200,
        "minHeight": 600,
        "minWidth": 800
      }
    ]
  }
}
```

### Step 4: Build Commands
```bash
# Development
npm run tauri dev

# Build for production
npm run tauri build
```

## Option 3: PWA (Progressive Web App)

### Step 1: Add PWA Support
```bash
npm install --save-dev workbox-webpack-plugin
```

### Step 2: Create manifest.json
```json
{
  "short_name": "VCHome Hospital",
  "name": "VCHome Hospital Management System",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

### Step 3: Register Service Worker
```javascript
// In src/index.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

## Comparison

| Feature | Electron | Tauri | PWA |
|---------|----------|-------|-----|
| File Size | Large (~100MB) | Small (~10MB) | Smallest |
| Performance | Good | Excellent | Good |
| Native Features | Full | Full | Limited |
| Offline Support | Full | Full | Partial |
| Auto Updates | Yes | Yes | Automatic |
| Installation | Required | Required | Optional |

## Recommendation

**For VCHome Hospital, I recommend Electron because:**
1. ✅ Easy migration from existing React app
2. ✅ Full native OS integration
3. ✅ Mature ecosystem
4. ✅ Good documentation
5. ✅ Works with existing Supabase integration