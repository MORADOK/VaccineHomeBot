const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true
    },
    show: false
  });

  // Show debug info on screen
  const debugInfo = `
    <html>
      <head><title>Debug Info</title></head>
      <body style="font-family: Arial; padding: 20px; background: #f0f0f0;">
        <h1>🔍 Debug Information</h1>
        <h2>App Status:</h2>
        <ul>
          <li><strong>isDev:</strong> ${!app.isPackaged}</li>
          <li><strong>app.isPackaged:</strong> ${app.isPackaged}</li>
          <li><strong>__dirname:</strong> ${__dirname}</li>
          <li><strong>process.resourcesPath:</strong> ${process.resourcesPath}</li>
          <li><strong>app.getAppPath():</strong> ${app.getAppPath()}</li>
        </ul>
        
        <h2>File Check:</h2>
        <div id="fileCheck">Checking files...</div>
        
        <h2>Actions:</h2>
        <button onclick="loadApp()" style="padding: 10px 20px; margin: 5px;">Load App</button>
        <button onclick="location.reload()" style="padding: 10px 20px; margin: 5px;">Reload</button>
        
        <script>
          const fs = require('fs');
          const path = require('path');
          
          const possiblePaths = [
            path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'index.html'),
            path.join(__dirname, '..', 'dist-electron', 'index.html'),
            path.join('${app.getAppPath()}', 'dist-electron', 'index.html'),
            path.join(process.resourcesPath, 'dist-electron', 'index.html')
          ];
          
          let fileCheckHtml = '<ul>';
          let foundPath = null;
          
          possiblePaths.forEach(filePath => {
            const exists = fs.existsSync(filePath);
            fileCheckHtml += '<li><strong>' + filePath + ':</strong> ' + (exists ? '✅ EXISTS' : '❌ NOT FOUND') + '</li>';
            if (exists && !foundPath) {
              foundPath = filePath;
            }
          });
          
          fileCheckHtml += '</ul>';
          
          if (foundPath) {
            fileCheckHtml += '<p><strong>✅ Found index.html at:</strong> ' + foundPath + '</p>';
          } else {
            fileCheckHtml += '<p><strong>❌ No index.html found!</strong></p>';
          }
          
          document.getElementById('fileCheck').innerHTML = fileCheckHtml;
          
          function loadApp() {
            if (foundPath) {
              window.location.href = 'file://' + foundPath.replace(/\\\\/g, '/');
            } else {
              alert('No index.html found!');
            }
          }
        </script>
      </body>
    </html>
  `;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(debugInfo)}`);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});