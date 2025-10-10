// Debug script for analyzing loading performance
console.log('🔍 Starting performance analysis...');

// Track loading times
const startTime = performance.now();
let reactMountTime = null;
let supabaseConnectTime = null;
let authCheckTime = null;

// Monitor DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const root = document.getElementById('root');
      if (root && root.children.length > 1) {
        reactMountTime = performance.now();
        console.log(`⚡ React mounted in: ${(reactMountTime - startTime).toFixed(2)}ms`);
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

// Track network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const requestStart = performance.now();
  
  console.log(`🌐 Network request: ${url}`);
  
  return originalFetch.apply(this, args).then(response => {
    const requestEnd = performance.now();
    console.log(`✅ Request completed: ${url} (${(requestEnd - requestStart).toFixed(2)}ms)`);
    
    // Track Supabase connections
    if (url.includes('supabase')) {
      supabaseConnectTime = requestEnd;
      console.log(`🔗 Supabase connection: ${(supabaseConnectTime - startTime).toFixed(2)}ms`);
    }
    
    return response;
  }).catch(error => {
    const requestEnd = performance.now();
    console.error(`❌ Request failed: ${url} (${(requestEnd - requestStart).toFixed(2)}ms)`, error);
    throw error;
  });
};

// Track resource loading
window.addEventListener('load', () => {
  const loadTime = performance.now();
  console.log(`🏁 Page fully loaded in: ${(loadTime - startTime).toFixed(2)}ms`);
  
  // Analyze performance entries
  const entries = performance.getEntriesByType('navigation')[0];
  console.log('📊 Performance breakdown:');
  console.log(`  - DNS lookup: ${entries.domainLookupEnd - entries.domainLookupStart}ms`);
  console.log(`  - TCP connection: ${entries.connectEnd - entries.connectStart}ms`);
  console.log(`  - Request/Response: ${entries.responseEnd - entries.requestStart}ms`);
  console.log(`  - DOM processing: ${entries.domContentLoadedEventEnd - entries.responseEnd}ms`);
  console.log(`  - Resource loading: ${entries.loadEventEnd - entries.domContentLoadedEventEnd}ms`);
  
  // Check for large resources
  const resources = performance.getEntriesByType('resource');
  const largeResources = resources.filter(r => r.transferSize > 100000);
  
  if (largeResources.length > 0) {
    console.warn('⚠️ Large resources detected:');
    largeResources.forEach(resource => {
      console.warn(`  - ${resource.name}: ${(resource.transferSize / 1024).toFixed(2)}KB`);
    });
  }
});

// Track React component mounting
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // Track auth-related logs
  if (message.includes('auth') || message.includes('Auth')) {
    authCheckTime = performance.now();
    console.log(`🔐 Auth check: ${(authCheckTime - startTime).toFixed(2)}ms`);
  }
  
  return originalConsoleLog.apply(this, args);
};

// Summary after 10 seconds
setTimeout(() => {
  console.log('📋 Performance Summary:');
  console.log(`  - Total time: ${(performance.now() - startTime).toFixed(2)}ms`);
  console.log(`  - React mount: ${reactMountTime ? (reactMountTime - startTime).toFixed(2) + 'ms' : 'Not detected'}`);
  console.log(`  - Supabase connect: ${supabaseConnectTime ? (supabaseConnectTime - startTime).toFixed(2) + 'ms' : 'Not detected'}`);
  console.log(`  - Auth check: ${authCheckTime ? (authCheckTime - startTime).toFixed(2) + 'ms' : 'Not detected'}`);
  
  // Recommendations
  console.log('💡 Recommendations:');
  if (supabaseConnectTime && supabaseConnectTime > 2000) {
    console.log('  - Supabase connection is slow (>2s). Consider connection pooling or caching.');
  }
  if (reactMountTime && reactMountTime > 1000) {
    console.log('  - React mounting is slow (>1s). Consider code splitting or lazy loading.');
  }
  
  observer.disconnect();
}, 10000);

console.log('🚀 Performance monitoring active for 10 seconds...');