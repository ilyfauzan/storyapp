const CACHE_NAME = 'story-spa-shell-v3';
const API_CACHE_NAME = 'story-spa-api-v2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/bundle.js',
  '/manifest.json',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png', 
  '/icons/icon-152x152.png',
  '/icons/icon-512x512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

let isUpdating = false;

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notifikasi Baru';
  const options = data.options || {
    body: 'Ada pesan baru!',
    icon: '/icons/icon-96x96.png',
    badge: '/icons/icon-96x96.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('install', event => {
  console.log(`[SW] Installing Service Worker - ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('[SW] Caching Application Shell assets');
        
        for (const url of SHELL_ASSETS) {
          try {
            const request = new Request(url, { 
              mode: url.startsWith('http') ? 'cors' : 'same-origin',
              cache: 'reload'
            });
            
            const response = await fetch(request);
            
            if (response.ok) {
              await cache.put(request, response);
              console.log('[SW] ✅ Cached:', url);
            } else {
              console.warn('[SW] ⚠️ Failed to cache (not found):', url, response.status);
            }
          } catch (error) {
            console.warn('[SW] ❌ Failed to cache (error):', url, error.message);
          }
        }
        
        console.log('[SW] 🎉 Application Shell caching completed');
        
        const clients = await self.clients.matchAll();
        if (clients.length === 0) {
          return self.skipWaiting();
        } else {
          console.log('[SW] 🕐 Waiting for clients to close before updating...');
        }
      })
      .catch(error => {
        console.error('[SW] ❌ Failed to open cache:', error);
        throw error;
      })
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW] Activating Service Worker - ${CACHE_NAME}`);
  isUpdating = true;
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] 🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      new Promise(resolve => setTimeout(resolve, 100))
    ])
    .then(() => {
      console.log('[SW] ✅ Service Worker activated - Ready for offline');
      isUpdating = false;
      return self.clients.claim();
    })
    .then(() => {
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            message: 'Service Worker updated successfully'
          });
        });
      });
    })
  );
});

self.addEventListener('fetch', event => {
  if (isUpdating) {
    console.log('[SW] ⏸️ Skipping fetch during update:', event.request.url);
    return;
  }
  
  const request = event.request;
  const url = new URL(request.url);
  
  if (
    url.origin === 'https://story-api.dicoding.dev' &&
    ['POST', 'PUT', 'DELETE'].includes(request.method)
  ) {
    event.respondWith(handleAPIWrite(request, url));
    return;
  }
  
  if (url.origin === 'https://story-api.dicoding.dev' && request.method === 'GET') {
    event.respondWith(networkFirstWithOfflinePage(request));
    return;
  }
  
  if (isShellAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  event.respondWith(fetch(request));
});

function isShellAsset(url) {
  return SHELL_ASSETS.some(asset => {
    if (asset.startsWith('http')) {
      return url === asset;
    } else {
      const cleanUrl = url.split('?')[0];
      return cleanUrl === asset || cleanUrl.endsWith(asset);
    }
  });
}

async function handleAPIWrite(request, url) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.delete('https://story-api.dicoding.dev/v1/stories');
      
      if (url.pathname.startsWith('/v1/stories/')) {
        await cache.delete(request.url);
      }
      
      console.log('[SW] 🔄 Cache invalidated after write operation');
    }
    
    return response;
  } catch (error) {
    console.log('[SW] 📵 Write operation failed - offline');
    return new Response(JSON.stringify({
      error: true,
      message: "Gagal melakukan operasi. Anda sedang offline."
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] 📦 Serving from cache:', request.url);
      
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse);
            console.log('[SW] 🔄 Background updated:', request.url);
          });
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] 💾 Cached new asset:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] ❌ Cache first strategy failed:', request.url, error);
    
    if (request.url.includes('.js')) {
      return new Response('console.error("Service Worker: Failed to load script");', {
        status: 503,
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function networkFirstWithOfflinePage(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] 💾 API response cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] 📵 Network failed, checking cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] 📦 Serving cached API response');
      return cachedResponse;
    }
    
    if (request.url.includes('/stories')) {
      return new Response(JSON.stringify({
        error: false,
        message: "Mode offline - Menggunakan data tersimpan",
        listStory: []
      }), {
        status: 200,
        statusText: 'OK',
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline': 'true'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: true,
      message: "Offline - Fitur tidak tersedia saat offline"
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] 🚀 Manual skipWaiting triggered');
    self.skipWaiting();
  }
});