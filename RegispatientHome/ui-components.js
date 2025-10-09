// UI Components and Utilities for VCHome Hospital Registration
class UIComponents {
  constructor() {
    this.toastContainer = null;
    this.loadingOverlay = null;
    this.init();
  }

  init() {
    this.createToastContainer();
    this.createLoadingOverlay();
  }

  // สร้าง Toast Container
  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(this.toastContainer);
  }

  // สร้าง Loading Overlay
  createLoadingOverlay() {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'loading-overlay';
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    this.loadingOverlay.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        max-width: 300px;
      ">
        <div style="
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <h3 style="margin: 0 0 10px; color: #333;">กำลังดำเนินการ</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">กรุณารอสักครู่...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(this.loadingOverlay);
  }

  // แสดง Toast Message
  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    
    const colors = {
      success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724', icon: '✅' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', icon: '❌' },
      warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', icon: '⚠️' },
      info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
      position: relative;
      font-family: 'Sarabun', sans-serif;
      line-height: 1.4;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 18px; flex-shrink: 0;">${color.icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: 500; margin-bottom: 2px;">
            ${type === 'success' ? 'สำเร็จ' : 
              type === 'error' ? 'เกิดข้อผิดพลาด' : 
              type === 'warning' ? 'คำเตือน' : 'แจ้งเตือน'}
          </div>
          <div style="font-size: 14px; opacity: 0.9;">${message}</div>
        </div>
        <button onclick="document.getElementById('${toastId}').remove()" 
                style="
                  background: none; 
                  border: none; 
                  font-size: 18px; 
                  cursor: pointer; 
                  opacity: 0.7;
                  padding: 0;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">×</button>
      </div>
    `;
    
    // เพิ่ม CSS Animation
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.toastContainer.appendChild(toast);
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (document.getElementById(toastId)) {
          toast.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }

  // แสดง Loading
  showLoading(message = 'กำลังดำเนินการ...') {
    const messageElement = this.loadingOverlay.querySelector('p');
    if (messageElement) {
      messageElement.textContent = message;
    }
    this.loadingOverlay.style.display = 'flex';
  }

  // ซ่อน Loading
  hideLoading() {
    this.loadingOverlay.style.display = 'none';
  }

  // สร้าง Modal Dialog
  showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 0;
      border-radius: 15px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    const buttonsHtml = buttons.map(btn => 
      `<button onclick="${btn.onclick}" style="
        padding: 12px 24px;
        margin: 0 5px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Sarabun', sans-serif;
        font-weight: 500;
        background: ${btn.primary ? '#007bff' : '#6c757d'};
        color: white;
      ">${btn.text}</button>`
    ).join('');
    
    modalContent.innerHTML = `
      <div style="padding: 25px 30px 20px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0; color: #333; font-family: 'Sarabun', sans-serif;">${title}</h3>
      </div>
      <div style="padding: 20px 30px;">
        ${content}
      </div>
      <div style="padding: 15px 30px 25px; text-align: right; border-top: 1px solid #eee;">
        ${buttonsHtml}
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return modal;
  }

  // ปรับปรุง Form Styling
  enhanceFormStyling() {
    const style = document.createElement('style');
    style.textContent = `
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #333;
        font-size: 16px;
      }
      
      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e1e5e9;
        border-radius: 10px;
        font-size: 16px;
        font-family: 'Sarabun', sans-serif;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .form-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }
      
      .form-input.error {
        border-color: #dc3545;
        background-color: #fff5f5;
      }
      
      .form-error {
        color: #dc3545;
        font-size: 14px;
        margin-top: 5px;
        display: block;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        border: none;
        padding: 14px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Sarabun', sans-serif;
        width: 100%;
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
      }
      
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Progress Bar
  createProgressBar(steps) {
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    `;
    
    steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
      `;
      
      stepElement.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${step.completed ? '#28a745' : '#dee2e6'};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-bottom: 8px;
        ">${index + 1}</div>
        <span style="
          font-size: 12px;
          text-align: center;
          color: ${step.completed ? '#28a745' : '#6c757d'};
          font-weight: ${step.completed ? '500' : 'normal'};
        ">${step.title}</span>
      `;
      
      progressBar.appendChild(stepElement);
    });
    
    progressContainer.appendChild(progressBar);
    return progressContainer;
  }
}

// Export for use
window.UIComponents = UIComponents;