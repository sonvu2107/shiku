/**
 * Performance Optimization Utilities
 * Tools for improving web performance - CSS optimization, resource hints, etc.
 */

/**
 * Inline critical CSS into HTML head
 * @param {string} criticalCSS - Critical CSS content
 */
export const inlineCriticalCSS = (criticalCSS) => {
  const style = document.createElement('style');
  style.setAttribute('data-critical', 'true');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
};

/**
 * Load non-critical CSS asynchronously
 * @param {string} href - CSS file URL
 * @param {string} media - Media query (default: 'all')
 */
export const loadAsyncCSS = (href, media = 'all') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  link.onload = () => {
    link.rel = 'stylesheet';
    link.media = media;
  };
  document.head.appendChild(link);
  
  // Fallback for browsers that don't support preload
  const noscript = document.createElement('noscript');
  const fallbackLink = document.createElement('link');
  fallbackLink.rel = 'stylesheet';
  fallbackLink.href = href;
  noscript.appendChild(fallbackLink);
  document.head.appendChild(noscript);
};

/**
 * Add resource hints for performance
 * @param {Array} hints - Array of resource hint objects
 */
export const addResourceHints = (hints) => {
  hints.forEach(({ rel, href, as, type, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    
    if (as) link.as = as;
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    
    document.head.appendChild(link);
  });
};

/**
 * Optimize font loading
 * @param {Array} fontUrls - Array of font URLs to preload
 */
export const optimizeFontLoading = (fontUrls) => {
  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Setup performance monitoring
 */
export const setupPerformanceMonitoring = () => {
  // Temporarily disable performance monitoring to fix errors
  console.log('Performance monitoring temporarily disabled');
  return;
  
  // Monitor Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Safely handle entry values
      if (!entry || typeof entry.value === 'undefined' || entry.value === null) {
        console.warn('Invalid performance entry:', entry);
        continue;
      }
      
      // Send metrics to analytics
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          metric_name: entry.name,
          metric_value: Math.round(entry.value),
          metric_rating: entry.rating || 'good'
        });
      }
      
      console.log(`${entry.name}: ${entry.value.toFixed(2)}ms`);
    }
  });

  // Observe various performance metrics
  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
  } catch (e) {
    console.warn('Performance Observer not supported:', e);
  }
};

/**
 * Remove unused CSS (basic implementation)
 * @param {string} css - CSS content
 * @param {Array} usedSelectors - Array of used CSS selectors
 * @returns {string} Optimized CSS
 */
export const removeUnusedCSS = (css, usedSelectors) => {
  // Simple implementation - in production, use PurgeCSS or similar
  const rules = css.split('}');
  const optimizedRules = rules.filter(rule => {
    const selector = rule.split('{')[0].trim();
    return usedSelectors.some(used => selector.includes(used));
  });
  
  return optimizedRules.join('}');
};

/**
 * Compress and minify CSS
 * @param {string} css - CSS content
 * @returns {string} Minified CSS
 */
export const minifyCSS = (css) => {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove last semicolon
    .replace(/\s*{\s*/g, '{') // Clean braces
    .replace(/;\s*/g, ';') // Clean semicolons
    .replace(/,\s*/g, ',') // Clean commas
    .trim();
};

/**
 * Setup service worker for caching
 * @param {string} swPath - Service worker file path
 */
export const setupServiceWorker = async (swPath = '/sw.js') => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, prompt user to refresh
            if (window.confirm('New version available! Refresh to update?')) {
              window.location.reload();
            }
          }
        });
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

/**
 * Optimize images for better performance
 * @param {Array} images - Array of image elements
 */
export const optimizeImages = (images) => {
  images.forEach(img => {
    // Add lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }
    
    // Add decoding hint
    img.decoding = 'async';
    
    // Set importance for critical images
    if (img.classList.contains('critical')) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
  });
};

/**
 * Prefetch next page resources
 * @param {Array} urls - URLs to prefetch
 */
export const prefetchResources = (urls) => {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Setup critical resource preloading
 */
export const preloadCriticalResources = () => {
  const criticalResources = [
    { href: '/src/main.jsx', as: 'script' },
    { href: '/src/App.jsx', as: 'script' },
    { href: '/src/api.js', as: 'script' }
  ];
  
  criticalResources.forEach(({ href, as }) => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    if (as) link.as = as;
    document.head.appendChild(link);
  });
};

/**
 * Measure and log performance metrics
 */
export const measurePerformance = () => {
  // Temporarily disable to fix errors
  console.log('Performance measurement temporarily disabled');
  return;
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintData = performance.getEntriesByType('paint');
      
      if (!perfData) {
        console.warn('Navigation performance data not available');
        return;
      }
      
      const metrics = {
        'DNS Lookup': perfData.domainLookupEnd - perfData.domainLookupStart,
        'TCP Connect': perfData.connectEnd - perfData.connectStart,
        'Request': perfData.responseStart - perfData.requestStart,
        'Response': perfData.responseEnd - perfData.responseStart,
        'DOM Parse': perfData.domContentLoadedEventEnd - perfData.responseEnd,
        'Resource Load': perfData.loadEventEnd - perfData.domContentLoadedEventEnd,
        'Total Load': perfData.loadEventEnd - perfData.navigationStart
      };
      
      paintData.forEach(paint => {
        if (paint && paint.name && typeof paint.startTime === 'number') {
          metrics[paint.name] = paint.startTime;
        }
      });
      
      console.table(metrics);
      
      // Send to analytics if available
      if (window.gtag) {
        Object.entries(metrics).forEach(([name, value]) => {
          if (typeof value === 'number' && !isNaN(value)) {
            window.gtag('event', 'timing_complete', {
              name: name.toLowerCase().replace(/\s+/g, '_'),
              value: Math.round(value)
            });
          }
        });
      }
    }, 0);
  });
};

export default {
  inlineCriticalCSS,
  loadAsyncCSS,
  addResourceHints,
  optimizeFontLoading,
  setupPerformanceMonitoring,
  removeUnusedCSS,
  minifyCSS,
  setupServiceWorker,
  optimizeImages,
  prefetchResources,
  preloadCriticalResources,
  measurePerformance
};