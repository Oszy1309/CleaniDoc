/**
 * Service Worker for CleaniDoc Dashboard
 * Enables offline-first PWA with caching and background sync
 *
 * Caching Strategy:
 * - Static assets: Cache-first (app shell)
 * - API calls: Network-first with cache fallback
 * - Images: Stale-while-revalidate
 *
 * Offline Support:
 * - Works without internet
 * - Auto-syncs when online
 * - Queues pending actions in IndexedDB
 * - Background sync for offline changes
 */

const CACHE_VERSION = 'cleani-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  '/api/shifts',
  '/api/tasks',
  '/api/users',
  '/api/locations',
];

/**
 * Install Event
 * Pre-cache static assets and app shell
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Caching static assets:', STATIC_ASSETS);
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Skip waiting - activate immediately
  self.skipWaiting();
});

/**
 * Activate Event
 * Clean up old caches and claim clients
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            // Delete old cache versions
            return cacheName.startsWith('cleani-') && cacheName !== CACHE_VERSION;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // Claim all clients
  return self.clients.claim();
});

/**
 * Fetch Event
 * Implement offline-first caching strategy
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API calls: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle images: Stale-while-revalidate
  if (isImage(url)) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Handle static assets: Cache-first
  event.respondWith(handleStaticRequest(event.request));
});

/**
 * Handle API requests: Network-first with cache fallback
 */
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Returning cached response:', request.url);
      return cachedResponse;
    }

    // No cache available
    console.log('[SW] No cache available:', request.url);
    return new Response('Offline - Data not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Handle image requests: Stale-while-revalidate
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);

  // Return cached image immediately
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update cache in background (don't await)
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    });

    return cachedResponse;
  }

  // No cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return placeholder image
    return new Response('', { status: 404 });
  }
}

/**
 * Handle static assets: Cache-first
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);

  // Return from cache if available
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline', { status: 503 });
  }
}

/**
 * Check if URL is an image
 */
function isImage(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname);
}

/**
 * Message Handler
 * Listen for messages from clients (e.g., sync requests)
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;

  console.log('[SW] Received message:', type);

  switch (type) {
    case 'SKIP_WAITING':
      // Update ready
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys().then(cacheNames => {
        Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      });
      break;

    case 'SYNC_OFFLINE_DATA':
      // Manually trigger sync
      syncOfflineData();
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Background Sync Event
 * Sync pending actions when online
 * Note: Requires Background Sync API support
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync Offline Data
 * Send all pending actions to server
 */
async function syncOfflineData() {
  try {
    console.log('[SW] Starting offline data sync...');

    // Open IndexedDB
    const db = await openIndexedDB();
    const tx = db.transaction('pending_actions', 'readonly');
    const store = tx.objectStore('pending_actions');
    const allActions = await getAllRecords(store);

    console.log('[SW] Found pending actions:', allActions.length);

    // Send each action to server
    for (const action of allActions) {
      try {
        await sendToServer(action);
        console.log('[SW] Synced action:', action.id);

        // Remove from queue after successful sync
        const removeTx = db.transaction('pending_actions', 'readwrite');
        await removeTx.objectStore('pending_actions').delete(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error);
        // Keep in queue for retry
      }
    }

    console.log('[SW] Offline data sync complete');

    // Notify all clients
    broadcastMessage({
      type: 'SYNC_COMPLETE',
      count: allActions.length,
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Send action to server
 */
async function sendToServer(action) {
  const response = await fetch(action.endpoint, {
    method: action.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${action.token}`,
    },
    body: JSON.stringify(action.data),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Open IndexedDB
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cleani-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all records from store
 */
function getAllRecords(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Broadcast message to all clients
 */
function broadcastMessage(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

/**
 * Periodic Background Sync
 * Attempt sync every 30 minutes when online
 * Note: Requires Periodic Background Sync API support
 */
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-offline-data') {
    event.waitUntil(
      syncOfflineData().catch(err => {
        console.error('[SW] Periodic sync failed:', err);
      })
    );
  }
});

console.log('[SW] Service Worker initialized');
