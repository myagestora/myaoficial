// Utility para forçar refresh definitivo no Android apenas uma vez
export const forceAndroidRefreshOnce = (): void => {
  if (typeof window === 'undefined') return;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(userAgent);
  
  if (!isAndroid) return;
  
  const refreshKey = 'android-menu-refreshed-v8';
  const hasRefreshed = localStorage.getItem(refreshKey);
  
  if (!hasRefreshed) {
    console.log('🔥 ANDROID: Executando refresh definitivo para corrigir menu...');
    
    // Limpar TODOS os storages
    localStorage.clear();
    sessionStorage.clear();
    
    // Marcar como atualizado ANTES do reload
    localStorage.setItem(refreshKey, 'true');
    localStorage.setItem('menu-version', 'v8-android-fix');
    
    // Limpar cache do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
      });
    }
    
    // Recarregar página forçadamente
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } else {
    console.log('✅ Android já foi atualizado para v8');
  }
};

// Verificar se precisa forçar atualização
export const checkAndroidUpdate = (): void => {
  if (typeof window === 'undefined') return;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(userAgent);
  
  if (!isAndroid) return;
  
  const currentVersion = localStorage.getItem('menu-version');
  const expectedVersion = 'v8-android-fix';
  
  if (currentVersion !== expectedVersion) {
    console.log(`🔄 Android Menu: ${currentVersion} → ${expectedVersion}`);
    forceAndroidRefreshOnce();
  }
};