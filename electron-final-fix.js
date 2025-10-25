import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  // Determine if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
      // Only disable webSecurity in dev mode for file:// protocol
      // In packaged app, this will be true for better security
      webSecurity: !isDev,
      devTools: isDev, // Only enable in dev mode
      allowRunningInsecureContent: false,
      sandbox: true,
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false,
    titleBarStyle: 'default',
    title: 'VCHome Hospital Management System'
  });

  // Simple and reliable path detection
  let startUrl;
  
  // Check if we have dist-electron folder (built app)
  const distElectronPath = path.join(__dirname, '..', 'dist-electron', 'index.html');
  
  if (fs.existsSync(distElectronPath)) {
    // Load from dist-electron (production build)
    startUrl = `file://${distElectronPath.replace(/\\/g, '/')}`;
    console.log('✅ Loading production build from:', distElectronPath);
  } else {
    // Fallback to dev server
    startUrl = 'http://localhost:5173';
    console.log('⚠️ Loading from dev server:', startUrl);
  }

  console.log('Final URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('❌ Failed to load:', errorDescription, validatedURL);
    
    // Show error page
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head><title>VCHome Hospital - Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5;">
          <h1>🏥 VCHome Hospital</h1>
          <h2 style="color: #d32f2f;">Unable to load application</h2>
          <p><strong>Error:</strong> ${errorDescription}</p>
          <p><strong>URL:</strong> ${validatedURL}</p>
          <p><strong>Expected file:</strong> ${distElectronPath}</p>
          <p><strong>File exists:</strong> ${fs.existsSync(distElectronPath) ? 'YES' : 'NO'}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 5px;">
            Retry
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin: 5px;">
            Close
          </button>
        </body>
      </html>
    `);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools temporarily to debug white screen
    mainWindow.webContents.openDevTools();
    
    // Wait 3 seconds then check if React rendered
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        const root = document.getElementById('root');
        const rootContent = root ? root.innerHTML : '';
        const hasContent = rootContent.length > 0;
        
        if (!hasContent) {
          // Show debug info on screen
          document.body.innerHTML = \`
            <div style="font-family: Arial; padding: 40px; background: #f5f5f5; min-height: 100vh;">
              <h1 style="color: #d32f2f;">🔍 Debug Information</h1>
              <h2>React did not render!</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Status:</h3>
                <p><strong>#root element:</strong> \${root ? 'EXISTS' : 'NOT FOUND'}</p>
                <p><strong>#root content length:</strong> \${rootContent.length}</p>
                <p><strong>Document ready state:</strong> \${document.readyState}</p>
                <p><strong>Scripts loaded:</strong> \${document.scripts.length}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Possible Issues:</h3>
                <ul style="text-align: left;">
                  <li>JavaScript files not loading</li>
                  <li>React initialization error</li>
                  <li>Supabase connection error</li>
                  <li>Routing error</li>
                </ul>
              </div>
              
              <button onclick="location.reload()" style="padding: 15px 30px; font-size: 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; margin: 10px;">
                Reload
              </button>
            </div>
          \`;
        }
        
        hasContent;
      `).then(hasContent => {
        if (hasContent) {
          console.log('✅ React rendered successfully!');
        } else {
          console.log('❌ React did not render - showing debug info');
        }
      });
    }, 3000);
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

  // Create simple menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => mainWindow.reload()
        },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
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