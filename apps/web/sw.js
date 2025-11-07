// Ghost Whistle Service Worker v1.7.1
const CACHE_NAME = 'ghost-whistle-v1.7.1-competition-fixed';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/howto',
  '/howto.html',
  '/manifest.webmanifest',
  '/whistel_logo_top_right_2048.png',
  '/4DqRlDPT_400x400.png.png',
  '/solana.png',
  '/idrs8cZ-zg_logos.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.95.3/lib/index.iife.js',
  'https://unpkg.com/bs58@5.0.0/index.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.startsWith('http')));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Never cache POST/PUT/PATCH/DELETE
  const method = event.request.method;
  if (method && method !== 'GET') {
    return; // Let network handle non-GET requests
  }
  // Bypass SW for Netlify Functions
  if (event.request.url.includes('/.netlify/functions/')) {
    return; // let the network handle it; avoid SW interference
  }
  // Network-first strategy for any HTML page to always get latest
  const accept = event.request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          try {
            const url = event.request.url || '';
            // Cache only http(s) responses to avoid chrome-extension errors
            if ((url.startsWith('http://') || url.startsWith('https://')) && response && response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
          } catch (e) {
            // Swallow caching errors
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Skip caching for critical dynamic scripts/endpoints (always network)
  const url = event.request.url;
  const skipCacheOrigins = [
    'api.mainnet-beta.solana.com',
    'mainnet.helius-rpc.com',
    'jup.ag',
    'quote-api.jup.ag',
  ];
  if (skipCacheOrigins.some(host => url.includes(host)) || url.includes('/x402-client.js')) {
    return; // allow default fetch, no caching
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Don't cache if not a success response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          try {
            const url = event.request.url || '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache).catch(() => {});
                });
            }
          } catch (e) {
            // ignore caching errors
          }

          return response;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/index.html');
      })
  );
});

// Background sync for node data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-node-data') {
    event.waitUntil(syncNodeData());
  }
});

async function syncNodeData() {
  try {
    const data = await getStoredNodeData();
    if (data) {
      await fetch('/api/sync-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

async function getStoredNodeData() {
  // Get data from IndexedDB
  return null; // Implement IndexedDB retrieval
}

// Push notifications for relay requests
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Ghost Whistle';
  const options = {
    body: data.body || 'New relay request available',
    icon: '/whistel_logo_top_right_2048.png',
    badge: '/whistel_logo_top_right_2048.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'join', title: 'Join Relay' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'join') {
    event.waitUntil(
      clients.openWindow('/?action=join-relay&id=' + event.notification.data.relayId)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('👻 Ghost Whistle Service Worker loaded');

