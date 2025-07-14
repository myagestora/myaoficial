const CACHE_NAME = 'mya-gestora-v6-force-android';
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
  // Ignorar requests de APIs, Supabase e manifest dinâmico
  if (event.request.method !== 'GET' || 
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('dynamic-manifest')) {
    return;
  }

  event.respondWith(
    fetch(event.request, {
      // Força revalidação
      cache: 'no-cache'
    }).then(response => {
      // Se a resposta for bem-sucedida, atualizar cache
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(() => {
      // Se falhar, tentar cache como fallback
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Se for documento e não tiver cache, retornar página inicial
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        throw new Error('No cached response available');
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker v6 - FORÇA ANDROID REFRESH');
  
  event.waitUntil(
    Promise.all([
      // 1. Deletar TODOS os caches
      caches.keys().then((cacheNames) => {
        console.log('🗑️ Deletando caches:', cacheNames);
        return Promise.all(cacheNames.map(name => caches.delete(name)));
      }),
      
      // 2. Limpar todos os storages
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FORCE_ANDROID_REFRESH',
            timestamp: Date.now()
          });
        });
      })
    ]).then(() => {
      console.log('✅ Limpeza completa realizada');
      // 3. Recriar cache mínimo
      return caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(['/']);
      });
    }).then(() => {
      console.log('🎯 Assumindo controle - Android forçado');
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