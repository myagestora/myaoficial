import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  BarChart3, 
  Calendar, 
  Grid3X3, 
  Settings,
  X,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isIOSDevice } from '@/utils/mobileDetection';
import { pwaInstaller } from '@/utils/pwaInstaller';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: CreditCard, label: 'Transações' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
];

const moreItems = [
  { path: '/scheduled', icon: Calendar, label: 'Agendadas' },
  { path: '/categories', icon: Grid3X3, label: 'Categorias' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const isIOS = isIOSDevice();
  
  // Debug visual para Android
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(userAgent);
  const menuVersion = "v8-android-fix";
  const debugTimestamp = Date.now();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleInstall = useCallback(async () => {
    console.log('🚀 Menu: Tentando instalar PWA...', { 
      canInstall, 
      isAndroid, 
      isIOS, 
      userAgent: navigator.userAgent,
      isInstalled: pwaInstaller.isAppInstalled()
    });
    
    setIsInstalling(true);
    
    try {
      // Para Android, tentar instalação nativa com timeout
      if (isAndroid) {
        console.log('📱 Android detectado - tentando instalação nativa...');
        
        // Aguardar um pouco para o beforeinstallprompt disparar se ainda não disparou
        if (!canInstall) {
          console.log('⏱️ Aguardando evento beforeinstallprompt...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const installed = await pwaInstaller.install();
        console.log('📊 Resultado da instalação nativa:', installed);
        
        if (installed) {
          console.log('✅ PWA instalado com sucesso via prompt nativo!');
          onClose();
          return;
        } else {
          console.log('❌ Instalação nativa não disponível, usando fallback');
          alert('Para instalar o app:\n\n1. Toque nos 3 pontos (⋮) do Chrome\n2. Selecione "Adicionar à tela inicial"\n3. Confirme "Adicionar"');
          onClose();
          return;
        }
      }
      
      // Para iOS, sempre mostrar instruções
      if (isIOS) {
        console.log('🍎 iOS detectado - mostrando instruções manuais');
        alert('Para instalar no iOS:\n\n1. Toque no ícone de compartilhar (□↗)\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"');
        onClose();
        return;
      }
      
      // Para outros dispositivos, tentar instalação nativa
      const installed = await pwaInstaller.install();
      if (installed) {
        onClose();
      } else {
        alert('Para adicionar à tela inicial, use as opções do seu navegador');
        onClose();
      }
      
    } catch (error) {
      console.error('💥 Erro durante instalação:', error);
      if (isAndroid) {
        alert('Para instalar o app:\n\n1. Toque nos 3 pontos (⋮) do Chrome\n2. Selecione "Adicionar à tela inicial"');
      } else {
        alert('Use as opções do navegador para adicionar à tela inicial');
      }
      onClose();
    } finally {
      setIsInstalling(false);
    }
  }, [onClose, canInstall, isAndroid, isIOS]);

  useEffect(() => {
    // Listener para status de instalação PWA
    pwaInstaller.onInstallStatusChange((canInstall) => {
      setCanInstall(canInstall);
    });

    // Listener para evento personalizado de instalação
    const handlePWAInstall = () => {
      handleInstall();
    };

    window.addEventListener('pwa-install', handlePWAInstall);

    return () => {
      window.removeEventListener('pwa-install', handlePWAInstall);
    };
  }, [handleInstall]);

  // Prevenir scroll do body quando menu está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div 
        className={cn(
          "absolute right-0 top-0 h-full w-72 bg-background border-l shadow-xl",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col",
          isIOS && "mobile-menu-ios",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Main navigation items */}
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center space-x-3 w-full p-3 rounded-lg transition-colors text-left",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          
          <div className="my-4 border-t border-muted" />
          
          {/* Additional items */}
          {moreItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center space-x-3 w-full p-3 rounded-lg transition-colors text-left",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {/* PWA Install Button - SEMPRE VISÍVEL no Android */}
          <div className="my-4 border-t border-muted" />
          <button
            onClick={isIOS ? () => {
              // Para iOS, mostrar instruções
              alert('Para instalar no iOS:\n1. Toque no ícone de compartilhar\n2. Selecione "Adicionar à Tela de Início"');
              onClose();
            } : () => {
              // Para Android e outros, sempre tentar instalação nativa primeiro
              handleInstall();
            }}
            disabled={isInstalling}
            className="flex items-center space-x-3 w-full p-3 rounded-lg transition-colors text-left bg-primary/5 hover:bg-primary/10 text-primary"
          >
            <Download size={20} />
            <div className="flex flex-col">
              <span className="font-medium">
                {isInstalling ? 'Instalando...' : 'Instalar App'}
              </span>
              <span className="text-xs text-muted-foreground">
                {isIOS ? 'Toque para ver instruções' : 'Instalar aplicativo PWA'}
              </span>
            </div>
          </button>
        </nav>
      </div>
    </div>
  );
};