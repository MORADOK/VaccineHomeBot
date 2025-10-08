const { spawn } = require('child_process');
const { createServer } = require('http');

let viteProcess;
let electronProcess;

// Function to check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Function to wait for server to be ready
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const http = require('http');
      const request = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 1000);
        }
      });

      request.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(check, 1000);
        }
      });
    }

    check();
  });
}

async function startDevelopment() {
  console.log('🏥 Starting VCHome Hospital Desktop App...');

  try {
    // Check if port 5173 is available
    const portAvailable = await checkPort(5173);
    if (!portAvailable) {
      console.log('⚠️  Port 5173 is busy, trying to start anyway...');
    }

    // Start Vite dev server
    console.log('🚀 Starting Vite development server...');
    viteProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true
    });

    viteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Vite:', output.trim());

      // Check if server is ready
      if (output.includes('Local:') || output.includes('localhost:5173')) {
        startElectron();
      }
    });

    viteProcess.stderr.on('data', (data) => {
      console.error('Vite Error:', data.toString());
    });

    // Fallback: start Electron after 5 seconds
    setTimeout(() => {
      if (!electronProcess) {
        console.log('⏰ Starting Electron (fallback timer)...');
        startElectron();
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Error starting development:', error);
  }
}

function startElectron() {
  if (electronProcess) return; // Already started

  console.log('⚡ Starting Electron...');
  electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true
  });

  electronProcess.on('close', () => {
    console.log('👋 Electron closed, shutting down...');
    cleanup();
  });
}

function cleanup() {
  if (viteProcess) {
    console.log('🛑 Stopping Vite server...');
    viteProcess.kill();
  }
  if (electronProcess) {
    console.log('🛑 Stopping Electron...');
    electronProcess.kill();
  }
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Start the development environment
startDevelopment();