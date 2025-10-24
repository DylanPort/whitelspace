// Ghost Whistle Service Worker
const CACHE_NAME = 'ghost-whistle-v1';
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
  'https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js'
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
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn.') && 
      !event.request.url.includes('unpkg.com')) {
    return;
  }

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

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

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

