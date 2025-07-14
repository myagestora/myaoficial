const CACHE_NAME = 'mya-gestora-v3';
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
  // Só interceptar requests GET e ignorar requests de APIs
  if (event.request.method !== 'GET' || 
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna o cache se disponível, senão busca da rede
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch(() => {
          // Se falhar ao buscar da rede, retornar página offline básica para navegação
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Assumir controle imediatamente
  return self.clients.claim();
});