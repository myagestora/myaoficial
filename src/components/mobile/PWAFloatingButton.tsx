import React, { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIOSDevice } from '@/utils/mobileDetection';
import { pwaInstaller } from '@/utils/pwaInstaller';

export const PWAFloatingButton = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isIOS = isIOSDevice();
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(userAgent);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    try {
      if (isIOS) {
        alert('Para instalar no iOS:\n1. Toque no ícone de compartilhar\n2. Selecione "Adicionar à Tela de Início"');
      } else if (isAndroid) {
        if (canInstall) {
          await pwaInstaller.install();
        } else {
          alert('Para adicionar à tela inicial:\n1. Toque nos 3 pontos do navegador\n2. Selecione "Adicionar à tela inicial"');
        }
      } else {
        await pwaInstaller.install();
      }
      setIsDismissed(true);
    } catch (error) {
      console.error('Erro ao instalar:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [canInstall, isIOS, isAndroid]);

  useEffect(() => {
    // Verificar se já foi instalado
    if (pwaInstaller.isAppInstalled()) {
      return;
    }

    // Verificar se foi dismissado
    const dismissed = localStorage.getItem('pwa-button-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Listener para status de instalação PWA
    pwaInstaller.onInstallStatusChange((canInstall) => {
      setCanInstall(canInstall);
      // Mostrar botão se pode instalar OU se é Android/iOS
      setIsVisible(canInstall || isAndroid || isIOS);
    });

    // Para Android, sempre mostrar após 3 segundos
    if (isAndroid) {
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    }
  }, [isAndroid, isIOS]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-button-dismissed', 'true');
  };

  if (!isVisible || isDismissed || pwaInstaller.isAppInstalled()) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {/* Botão Principal */}
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        size="icon"
      >
        <Download size={24} />
      </Button>
      
      {/* Label/Tooltip */}
      <div className="bg-black/80 text-white text-xs px-2 py-1 rounded mr-2 max-w-[120px] text-center">
        {isInstalling ? 'Instalando...' : 'Instalar App'}
      </div>
      
      {/* Botão Fechar */}
      <Button
        onClick={handleDismiss}
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </Button>
    </div>
  );
};