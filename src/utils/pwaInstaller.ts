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
    console.log('🚀 Tentativa de instalação PWA iniciada');
    
    // Tentar forçar instalação mesmo se canInstall() retornar false
    if (!this.deferredPrompt && !this.canInstall()) {
      console.log('⚠️ PWA: Tentando forçar instalação sem prompt disponível');
      
      // Tentar aguardar um pouco para ver se o prompt aparece
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
      console.log('🎯 Disparando prompt de instalação...');
      
      // Guardar referência antes de disparar
      const currentPrompt = this.deferredPrompt;
      
      // Resetar imediatamente após prompt()
      await currentPrompt.prompt();
      this.deferredPrompt = null;
      
      console.log('⏱️ Aguardando escolha do usuário com timeout...');
      
      // Implementar timeout para userChoice
      const choiceResult = await Promise.race([
        currentPrompt.userChoice,
        new Promise<{outcome: string}>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        )
      ]);
      
      console.log('📋 Resultado da escolha do usuário:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ PWA: Usuário aceitou a instalação');
        
        // Aguardar evento appinstalled ou verificar display mode
        const installationConfirmed = await this.waitForInstallation();
        
        if (installationConfirmed) {
          this.isInstalled = true;
          this.notifyCallbacks(false);
          return true;
        } else {
          console.log('⚠️ PWA: Instalação aceita mas não confirmada, assumindo sucesso');
          this.isInstalled = true;
          this.notifyCallbacks(false);
          return true;
        }
      } else {
        console.log('❌ PWA: Usuário recusou a instalação');
        return false;
      }
    } catch (error) {
      console.log('⚠️ PWA: Timeout ou erro na escolha do usuário:', error);
      
      // Fallback: verificar se instalação aconteceu mesmo com timeout
      const installationDetected = await this.waitForInstallation();
      
      if (installationDetected) {
        console.log('✅ PWA: Instalação detectada apesar do timeout');
        this.isInstalled = true;
        this.notifyCallbacks(false);
        return true;
      }
      
      console.log('❌ PWA: Instalação não detectada');
      return false;
    }
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