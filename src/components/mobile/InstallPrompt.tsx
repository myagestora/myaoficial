import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { pwaInstaller } from '@/utils/pwaInstaller';

export const InstallPrompt = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Verificar se já foi dispensado
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    pwaInstaller.onInstallStatusChange((canInstall) => {
      setCanInstall(canInstall);
      setIsVisible(canInstall);
    });
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    setHasError(false);
    
    try {
      const installed = await pwaInstaller.install();
      if (installed) {
        setIsVisible(false);
      } else {
        setHasError(true);
        // Reset após 3 segundos
        setTimeout(() => {
          setIsInstalling(false);
          setHasError(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao instalar:', error);
      setHasError(true);
      // Reset após 3 segundos
      setTimeout(() => {
        setIsInstalling(false);
        setHasError(false);
      }, 3000);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!isVisible || !canInstall) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 bg-primary text-primary-foreground border-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-sm mb-1">
              Instalar Mya Gestora
            </h3>
            <p className="text-xs opacity-90 mb-3">
              Instale o app para acesso mais rápido e experiência completa
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex items-center space-x-1"
              >
                <Download size={14} />
                <span>
                  {hasError ? 'Erro ao instalar' : isInstalling ? 'Instalando...' : 'Instalar'}
                </span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Agora não
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};