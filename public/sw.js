const CACHE_NAME = 'mya-gestora-v7-stable';
const urlsToCache = [
  '/',
  '/dashboard',
  '/transactions',
  '/goals',
  '/reports',
  '/categories',
  '/settings',
  '/scheduled'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        // Fazer cache apenas dos recursos que realmente existem
        return cache.addAll(urlsToCache.filter(url => {
          // Não tentar fazer cache de arquivos estáticos que podem não existir
          return !url.includes('/static/');
        }));
      })
      .catch((error) => {
        console.log('Erro ao fazer cache:', error);
      })
  );
  // Forçar ativação imediata do novo service worker
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Ignorar requests de APIs, Supabase e auth
  if (event.request.method !== 'GET' || 
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('dynamic-manifest') ||
      event.request.url.includes('/login') ||
      event.request.url.includes('/reset-password')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(response => {
      // Cache static resources normally
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Fallback to cache
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        throw new Error('No cached response available');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker v7 - Stable');
  
  event.waitUntil(
    // Clean old caches but keep newer ones
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.includes('mya-gestora')) {
            console.log('🗑️ Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎯 Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Listener para mensagens do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});