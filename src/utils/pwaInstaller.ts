interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export class PWAInstaller {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private callbacks: ((canInstall: boolean) => void)[] = [];
  private swReady = false;

  constructor() {
    this.setupEventListeners();
    this.checkIfInstalled();
    this.waitForServiceWorker();
  }

  private async waitForServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ PWA: Service Worker is ready', registration);
        this.swReady = true;
        
        // Force check for install prompt after SW is ready
        setTimeout(() => {
          if (!this.deferredPrompt && !this.isInstalled) {
            console.log('🔍 PWA: No install prompt detected after SW ready - checking criteria');
            this.debugPWACriteria();
          }
        }, 1000);
      } catch (error) {
        console.error('❌ PWA: Service Worker not ready:', error);
      }
    }
  }

  private debugPWACriteria() {
    console.log('🔍 PWA Debug - Checking all criteria:');
    console.log('- HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
    console.log('- Service Worker:', 'serviceWorker' in navigator && this.swReady);
    console.log('- Manifest:', document.querySelector('link[rel="manifest"]') !== null);
    console.log('- Display mode:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('- User agent:', navigator.userAgent);
    console.log('- Current URL:', window.location.href);
  }

  private setupEventListeners() {
    console.log('🔧 Configurando listeners PWA...');
    
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎯 beforeinstallprompt disparado!', e);
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyCallbacks(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ App instalado via evento appinstalled');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyCallbacks(false);
    });
  }

  private checkIfInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    console.log('📱 Verificando se PWA está instalado:', {
      isStandalone,
      isIOSStandalone,
      displayMode: window.matchMedia('(display-mode: standalone)'),
      userAgent: navigator.userAgent
    });

    if (isStandalone) {
      console.log('✅ PWA detectado como instalado (standalone)');
      this.isInstalled = true;
    }

    if (isIOSStandalone) {
      console.log('✅ PWA detectado como instalado (iOS standalone)');
      this.isInstalled = true;
    }
  }

  public canInstall(): boolean {
    const hasPrompt = this.deferredPrompt !== null;
    const notInstalled = !this.isInstalled;
    const swReady = this.swReady;
    
    const canInstall = hasPrompt && notInstalled && swReady;
    
    console.log(`🔍 PWA: Can install = ${canInstall} (prompt: ${hasPrompt}, installed: ${!notInstalled}, swReady: ${swReady})`);
    
    if (!canInstall && !this.isInstalled) {
      this.debugPWACriteria();
    }
    
    return canInstall;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async install(): Promise<boolean> {
    console.log('🚀 PWA: Iniciando instalação');
    
    // Tentar forçar instalação mesmo se canInstall() retornar false
    if (!this.deferredPrompt && !this.canInstall()) {
      console.log('⚠️ PWA: Tentando forçar instalação sem prompt disponível');
      
      // Tentar aguardar um pouco para ver se o prompt aparece
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!this.deferredPrompt) {
        console.error('❌ PWA: Nenhum prompt de instalação disponível após aguardar');
        return false;
      }
    }

    if (!this.deferredPrompt) {
      console.error('❌ PWA: Prompt de instalação não disponível');
      return false;
    }

    try {
      console.log('🎯 PWA: Disparando prompt de instalação...');
      
      // Guardar referência antes de disparar
      const currentPrompt = this.deferredPrompt;
      
      // Disparar o prompt e resetar imediatamente
      await currentPrompt.prompt();
      this.deferredPrompt = null;
      
      console.log('⏳ PWA: Aguardando resposta do usuário...');
      
      // Aguardar com timeout mais longo
      let userChoice;
      try {
        userChoice = await Promise.race([
          currentPrompt.userChoice,
          new Promise<{outcome: string}>((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
        ]);
        console.log('📋 PWA: Resposta do usuário:', userChoice);
      } catch (timeoutError) {
        console.log('⏰ PWA: Timeout na resposta do usuário, verificando instalação...');
        // Continue para verificar se foi instalado mesmo com timeout
      }
      
      // Aguardar um pouco antes de verificar instalação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar se foi instalado independente da resposta
      const wasInstalled = await this.checkInstallationStatus();
      
      if (wasInstalled) {
        console.log('✅ PWA: Instalação detectada com sucesso!');
        this.isInstalled = true;
        this.notifyCallbacks(false);
        return true;
      }
      
      // Se temos userChoice e foi aceito, considerar como sucesso
      if (userChoice && userChoice.outcome === 'accepted') {
        console.log('✅ PWA: Usuário aceitou, assumindo instalação bem-sucedida');
        this.isInstalled = true;
        this.notifyCallbacks(false);
        return true;
      }
      
      if (userChoice && userChoice.outcome === 'dismissed') {
        console.log('❌ PWA: Usuário cancelou a instalação');
        return false;
      }
      
      // Fallback - assumir sucesso se chegou até aqui
      console.log('🤔 PWA: Status indefinido, assumindo sucesso');
      this.isInstalled = true;
      this.notifyCallbacks(false);
      return true;
      
    } catch (error) {
      console.error('💥 PWA: Erro durante instalação:', error);
      
      // Verificar se foi instalado mesmo com erro
      const wasInstalled = await this.checkInstallationStatus();
      if (wasInstalled) {
        console.log('✅ PWA: Instalação detectada após erro');
        this.isInstalled = true;
        this.notifyCallbacks(false);
        return true;
      }
      
      return false;
    }
  }

  private async checkInstallationStatus(): Promise<boolean> {
    console.log('🔍 PWA: Verificando status da instalação...');
    
    return new Promise((resolve) => {
      let resolved = false;
      
      // Listener para evento appinstalled
      const onAppInstalled = () => {
        console.log('✅ PWA: Evento appinstalled detectado');
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };
      
      window.addEventListener('appinstalled', onAppInstalled, { once: true });
      
      // Verificar mudança no display mode múltiplas vezes
      const checkDisplayMode = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;
        
        console.log('📱 PWA: Verificando display mode:', { isStandalone, isIOSStandalone });
        
        if ((isStandalone || isIOSStandalone) && !resolved) {
          console.log('✅ PWA: Modo standalone detectado!');
          resolved = true;
          resolve(true);
        }
      };
      
      // Verificações escalonadas
      setTimeout(checkDisplayMode, 500);
      setTimeout(checkDisplayMode, 1000);
      setTimeout(checkDisplayMode, 2000);
      setTimeout(checkDisplayMode, 3000);
      
      // Timeout final
      setTimeout(() => {
        window.removeEventListener('appinstalled', onAppInstalled);
        
        if (!resolved) {
          console.log('⏰ PWA: Timeout na verificação - instalação não detectada');
          resolved = true;
          resolve(false);
        }
      }, 3000);
    });
  }

  private async waitForInstallation(): Promise<boolean> {
    console.log('🔍 Verificando se instalação foi completada...');
    
    return new Promise((resolve) => {
      let resolved = false;
      
      // Listener para evento appinstalled
      const onAppInstalled = () => {
        console.log('✅ Evento appinstalled detectado');
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      };
      
      window.addEventListener('appinstalled', onAppInstalled, { once: true });
      
      // Verificar mudança no display mode
      const checkDisplayMode = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        console.log('📱 Display mode standalone:', isStandalone);
        
        if (isStandalone && !resolved) {
          resolved = true;
          resolve(true);
        }
      };
      
      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('appinstalled', onAppInstalled);
        
        if (!resolved) {
          console.log('⏱️ Timeout na verificação de instalação');
          resolved = true;
          resolve(false);
        }
      }, 3000);
      
      // Verificar display mode após pequeno delay
      setTimeout(checkDisplayMode, 1000);
      setTimeout(checkDisplayMode, 2000);
    });
  }

  public onInstallStatusChange(callback: (canInstall: boolean) => void) {
    this.callbacks.push(callback);
    callback(this.canInstall());
  }

  private notifyCallbacks(canInstall: boolean) {
    this.callbacks.forEach(callback => callback(canInstall));
  }
}

// Instância singleton
export const pwaInstaller = new PWAInstaller();