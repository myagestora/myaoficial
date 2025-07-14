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
    
    if (!this.canInstall()) {
      console.error('❌ PWA: Cannot install - requirements not met');
      return false;
    }

    try {
      console.log('🎯 Disparando prompt de instalação...');
      await this.deferredPrompt!.prompt();
      const choiceResult = await this.deferredPrompt!.userChoice;
      
      console.log('📋 Resultado da escolha do usuário:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Usuário aceitou a instalação');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('❌ Usuário rejeitou a instalação');
        return false;
      }
    } catch (error) {
      console.error('💥 Erro ao instalar PWA:', error);
      return false;
    }
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