// Simple Electron test without Vite dependency
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load a simple HTML page for testing
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <title>VCHome Hospital - Test</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          h1 { font-size: 2.5em; margin-bottom: 20px; }
          p { font-size: 1.2em; line-height: 1.6; }
          .status { 
            background: #4CAF50; 
            padding: 10px 20px; 
            border-radius: 25px; 
            display: inline-block; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏥 VCHome Hospital</h1>
          <div class="status">✅ Electron is working!</div>
          <p>Desktop Application Test</p>
          <p>This confirms that Electron is properly configured and running.</p>
          <p><strong>Next step:</strong> Connect to React development server</p>
        </div>
      </body>
    </html>
  `);

  mainWindow.on('closed', () => {
    mainWindow = null;
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

console.log('🚀 Electron test app started');
console.log('📱 If you see the VCHome Hospital window, Electron is working correctly!');