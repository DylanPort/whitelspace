// Ghost Whistle Service Worker
const CACHE_NAME = 'ghost-whistle-v2.0-x402-sol';

// Core assets to cache (only files we control)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// Install event - cache core assets only
self.addEventListener('install', (event) => {
  console.log('👻 Ghost Whistle Service Worker loaded');
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching core assets');
        // Cache each asset individually to avoid failures
        return Promise.allSettled(
          CORE_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`⚠️ Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Skip cross-origin requests (CDNs, etc)
  const requestUrl = new URL(event.request.url);
  const isOwnDomain = requestUrl.origin === location.origin;
  
  if (!isOwnDomain) {
    // For external resources, just fetch normally (don't cache)
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();
        
        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // If fetch fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((cachedHtml) => {
              return cachedHtml || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' }
              });
            });
          }
          
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🎯 Service Worker script loaded');



