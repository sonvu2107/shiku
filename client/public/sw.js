/**
 * Shiku Service Worker
 * Caching strategy cho static assets và API responses
 * 
 * Strategies:
 * - Static assets (JS, CSS, fonts): Cache-first với TTL 30 ngày
 * - Images: Cache-first với giới hạn 100 items
 * - API calls: Network-first với fallback
 * - HTML: Network-first để luôn fresh
 */

const CACHE_VERSION = 'shiku-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/assets/shiku-logo.svg',
  '/assets/shiku-mark.svg',
  '/assets/Shiku-logo-1.png',
  '/assets/posts.png',
];

// Cache duration in milliseconds
const CACHE_DURATION = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  images: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,               // 5 minutes
};

// Max items in image cache
const MAX_IMAGE_CACHE_ITEMS = 100;

/**
 * Install event - Precache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Precache complete, skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('shiku-') && name !== STATIC_CACHE && name !== IMAGES_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - Apply caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except CDN images)
  if (url.origin !== self.location.origin && !isImageUrl(url.href)) {
    return;
  }

  // Skip WebSocket and HMR requests
  if (url.pathname.includes('__vite') || url.pathname.includes('socket.io') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Apply appropriate caching strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageUrl(url.href)) {
    event.respondWith(cacheFirstWithLimit(request, IMAGES_CACHE, MAX_IMAGE_CACHE_ITEMS));
  } else if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
  }
});

/**
 * Cache-first strategy
 * Return from cache if available, otherwise fetch and cache
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Cache-first with limit strategy
 * Same as cache-first but limits cache size
 */
async function cacheFirstWithLimit(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Check cache size and trim if needed
      const keys = await cache.keys();
      if (keys.length >= maxItems) {
        // Remove oldest entries (FIFO)
        const toDelete = keys.slice(0, keys.length - maxItems + 1);
        await Promise.all(toDelete.map(key => cache.delete(key)));
      }
      
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    // Return placeholder for failed images
    return new Response('', { status: 404 });
  }
}

/**
 * Network-first strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page or error
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first with cache strategy for API
 * Try network, cache successful responses, fall back to cache on failure
 */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache successful API responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to return cached response
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Returning cached API response for:', request.url);
      return cachedResponse;
    }
    
    // Return error response
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Helper functions
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff|woff2|ttf|eot|svg)$/.test(pathname);
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|webp|avif|ico)(\?.*)?$/i.test(url) ||
         url.includes('cloudinary.com') ||
         url.includes('res.cloudinary.com');
}

function isApiRequest(pathname) {
  return pathname.startsWith('/api/') && 
         !pathname.includes('/auth/') && 
         !pathname.includes('/me') &&
         !pathname.includes('/my-');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         request.headers.get('accept')?.includes('text/html');
}

/**
 * Message handler for cache control from main app
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((names) => 
          Promise.all(names.map((name) => caches.delete(name)))
        )
      );
      break;
      
    case 'CLEAR_API_CACHE':
      event.waitUntil(caches.delete(API_CACHE));
      break;
      
    default:
      break;
  }
});

console.log('[SW] Service Worker loaded');

