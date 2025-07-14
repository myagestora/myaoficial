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

  constructor() {
    this.setupEventListeners();
    this.checkIfInstalled();
  }

  private setupEventListeners() {
    console.log('🔧 Configurando listeners PWA...');
    
    // Capturar o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎯 beforeinstallprompt disparado!', e);
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyCallbacks(true);
    });

    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('✅ App instalado via evento appinstalled');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyCallbacks(false);
    });

    // Debug: verificar se Service Worker está ativo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        console.log('🔧 Service Worker ativo e pronto');
      });
    }
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

    // Verificar se está rodando em modo standalone (instalado)
    if (isStandalone) {
      console.log('✅ PWA detectado como instalado (standalone)');
      this.isInstalled = true;
    }

    // Verificar para iOS
    if (isIOSStandalone) {
      console.log('✅ PWA detectado como instalado (iOS standalone)');
      this.isInstalled = true;
    }
  }

  public canInstall(): boolean {
    return !this.isInstalled && this.deferredPrompt !== null;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async install(): Promise<boolean> {
    console.log('🚀 Tentativa de instalação PWA iniciada');
    console.log('📊 Estado atual:', {
      deferredPrompt: !!this.deferredPrompt,
      isInstalled: this.isInstalled,
      canInstall: this.canInstall()
    });

    if (!this.deferredPrompt) {
      console.log('❌ Nenhum prompt de instalação disponível');
      return false;
    }

    try {
      console.log('🎯 Disparando prompt de instalação...');
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('📋 Resultado da escolha do usuário:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Usuário aceitou a instalação');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('❌ Usuário rejeitou a instalação');
      }
      
      return false;
    } catch (error) {
      console.error('💥 Erro ao instalar PWA:', error);
      return false;
    }
  }

  public onInstallStatusChange(callback: (canInstall: boolean) => void) {
    this.callbacks.push(callback);
    // Chamar imediatamente com o status atual
    callback(this.canInstall());
  }

  private notifyCallbacks(canInstall: boolean) {
    this.callbacks.forEach(callback => callback(canInstall));
  }
}

// Instância singleton
export const pwaInstaller = new PWAInstaller();