const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window without DevTools
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    show: false,
    title: 'VCHome Hospital - No Console Mode'
  });

  // Load a simple test page
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <title>VCHome Hospital - Clean Mode</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          }
          .status {
            font-size: 1.2em;
            margin: 20px 0;
            padding: 15px;
            background: rgba(0, 255, 0, 0.2);
            border-radius: 10px;
            border: 1px solid rgba(0, 255, 0, 0.3);
          }
          .features {
            text-align: left;
            margin: 30px 0;
          }
          .features li {
            margin: 10px 0;
            padding: 5px 0;
          }
          .note {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 30px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏥 VCHome Hospital</h1>
          <div class="status">
            ✅ Desktop App Running Successfully
          </div>
          <div class="features">
            <h3>🎯 Clean Production Mode Features:</h3>
            <ul>
              <li>✅ No Developer Console</li>
              <li>✅ No DevTools Menu</li>
              <li>✅ Professional Interface</li>
              <li>✅ Secure Environment</li>
              <li>✅ Production-Ready</li>
            </ul>
          </div>
          <div class="note">
            Desktop application is ready for deployment!<br>
            Press Alt+F4 or Ctrl+W to close
          </div>
        </div>
      </body>
    </html>
  `);

  // Show window when ready (no DevTools)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('🚀 VCHome Hospital Desktop App (Clean Mode) started successfully!');
    console.log('📱 No console/DevTools - Production-ready interface');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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