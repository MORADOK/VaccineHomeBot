// Optimization script for faster loading
console.log('🚀 Loading optimization script...');

// 1. Preload critical resources
function preloadCriticalResources() {
  const criticalResources = [
    '/src/main.tsx',
    '/src/App.tsx',
    '/src/index.css'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = resource;
    document.head.appendChild(link);
  });
  
  console.log('✅ Critical resources preloaded');
}

// 2. Optimize Supabase connection
function optimizeSupabaseConnection() {
  // Add connection timeout
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    if (url.includes('supabase')) {
      options.timeout = options.timeout || 5000; // 5 second timeout
      
      return Promise.race([
        originalFetch(url, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase connection timeout')), options.timeout)
        )
      ]);
    }
    return originalFetch(url, options);
  };
  
  console.log('✅ Supabase connection optimized');
}

// 3. Add loading progress feedback
function enhanceLoadingFeedback() {
  const steps = [
    { text: 'กำลังโหลดส่วนประกอบ...', delay: 500 },
    { text: 'กำลังเชื่อมต่อฐานข้อมูล...', delay: 1500 },
    { text: 'กำลังตรวจสอบสิทธิ์...', delay: 2500 },
    { text: 'เกือบเสร็จแล้ว...', delay: 3500 }
  ];
  
  steps.forEach(step => {
    setTimeout(() => {
      const loadingStep = document.querySelector('.loading-step');
      if (loadingStep && !document.querySelector('[data-react-root]')) {
        loadingStep.textContent = step.text;
      }
    }, step.delay);
  });
  
  console.log('✅ Loading feedback enhanced');
}

// 4. Monitor performance and show warnings
function monitorPerformance() {
  const startTime = performance.now();
  
  // Check for slow loading after 5 seconds
  setTimeout(() => {
    const currentTime = performance.now();
    const loadTime = currentTime - startTime;
    
    if (loadTime > 5000 && !document.querySelector('[data-react-root]')) {
      console.warn('⚠️ Slow loading detected:', loadTime + 'ms');
      
      const perfInfo = document.getElementById('perf-info');
      if (perfInfo) {
        perfInfo.style.display = 'block';
        perfInfo.innerHTML = `
          <p style="color: #f59e0b;">การโหลดช้ากว่าปกติ (${(loadTime/1000).toFixed(1)}s)</p>
          <p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>
        `;
      }
    }
  }, 5000);
  
  // Success callback
  const checkSuccess = setInterval(() => {
    if (document.querySelector('[data-react-root]') || document.querySelector('.app-loaded')) {
      const loadTime = performance.now() - startTime;
      console.log('✅ App loaded successfully in:', loadTime.toFixed(2) + 'ms');
      clearInterval(checkSuccess);
    }
  }, 100);
  
  console.log('✅ Performance monitoring active');
}

// 5. Initialize optimizations
function initializeOptimizations() {
  try {
    preloadCriticalResources();
    optimizeSupabaseConnection();
    enhanceLoadingFeedback();
    monitorPerformance();
    
    console.log('🎯 All optimizations initialized');
  } catch (error) {
    console.error('❌ Optimization error:', error);
  }
}

// Run optimizations when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptimizations);
} else {
  initializeOptimizations();
}

// Export for debugging
window.loadingOptimizer = {
  preloadCriticalResources,
  optimizeSupabaseConnection,
  enhanceLoadingFeedback,
  monitorPerformance
};