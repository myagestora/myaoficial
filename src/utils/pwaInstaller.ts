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
    // Capturar o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyCallbacks(true);
    });

    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyCallbacks(false);
    });
  }

  private checkIfInstalled() {
    // Verificar se está rodando em modo standalone (instalado)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // Verificar para iOS
    if ((window.navigator as any).standalone === true) {
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
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        this.deferredPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
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