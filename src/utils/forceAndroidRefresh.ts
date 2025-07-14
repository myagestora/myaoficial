// Utilitário para forçar refresh completo no Android
export const forceAndroidRefresh = () => {
  const isAndroid = /android/i.test(navigator.userAgent);
  
  if (!isAndroid) return;
  
  console.log('🔥 ANDROID: Iniciando refresh forçado');
  
  // 1. Limpar todos os storages
  try {
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Limpar cache do service worker
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // 3. Atualizar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
          registration.unregister().then(() => {
            console.log('🔥 Service Worker desregistrado');
          });
        });
      });
    }
    
    // 4. Marcar versão atual
    localStorage.setItem('app-version', 'v6-force-android');
    localStorage.setItem('android-force-refresh', Date.now().toString());
    
    console.log('🔥 ANDROID: Refresh completo em 2 segundos');
    
    // 5. Force reload
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro no refresh Android:', error);
    // Fallback: apenas reload
    window.location.reload();
  }
};

// Detectar se é PWA instalado
export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
};

// Verificar se precisa forçar update
export const checkAndroidNeedsUpdate = (): boolean => {
  const isAndroid = /android/i.test(navigator.userAgent);
  const lastRefresh = localStorage.getItem('android-force-refresh');
  const appVersion = localStorage.getItem('app-version');
  const currentVersion = 'v6-force-android';
  
  if (!isAndroid) return false;
  
  // Se não tem versão ou versão diferente
  if (!appVersion || appVersion !== currentVersion) {
    return true;
  }
  
  // Se último refresh foi há mais de 1 hora
  if (lastRefresh) {
    const hoursSinceRefresh = (Date.now() - parseInt(lastRefresh)) / (1000 * 60 * 60);
    return hoursSinceRefresh > 1;
  }
  
  return false;
};