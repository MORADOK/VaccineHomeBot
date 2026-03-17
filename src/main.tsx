import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive-ui.css'
import App from './App'

// Add error handling for better debugging
try {
  console.log('[main.tsx] Starting React app...');
  console.log('[main.tsx] Environment:', import.meta.env.MODE);
  console.log('[main.tsx] BASE_URL:', import.meta.env.BASE_URL);

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }

  console.log('[main.tsx] Root element found, mounting React...');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  console.log('[main.tsx] React mounted successfully');
} catch (error) {
  console.error('[main.tsx] Fatal error:', error);

  // Show error message in the page
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #e53e3e;">เกิดข้อผิดพลาดในการโหลดระบบ</h1>
        <p style="color: #666; margin: 20px 0;">กรุณากด F12 เพื่อเปิด Developer Tools และตรวจสอบ Console</p>
        <pre style="background: #f5f5f5; padding: 20px; text-align: left; overflow: auto;">
${error instanceof Error ? error.message : String(error)}
        </pre>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
          รีโหลดระบบ
        </button>
      </div>
    `;
  }
}
