
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registrado com sucesso:', registration);
          })
          .catch((registrationError) => {
            console.log('Falha no registro do SW:', registrationError);
          });
      });
    }

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne o prompt automático
      e.preventDefault();
      // Salva o evento para usar depois
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listener para quando o app é instalado
    window.addEventListener('appinstalled', () => {
      console.log('PWA foi instalado');
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: 'App Instalado!',
        description: 'Mya Finance Manager foi instalado com sucesso!',
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Aguarda a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    } else {
      console.log('Usuário recusou a instalação');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    installPWA
  };
};
