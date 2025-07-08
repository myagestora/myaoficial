
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const usePreferences = () => {
  const { toast } = useToast();
  const [darkTheme, setDarkTheme] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);

  // Effect para carregar preferências do usuário
  useEffect(() => {
    // Carregar preferências salvas no localStorage
    const savedDarkTheme = localStorage.getItem('darkTheme') === 'true';
    const savedAnimations = localStorage.getItem('animations') !== 'false'; // padrão true
    const savedNotificationSound = localStorage.getItem('notificationSound') !== 'false'; // padrão true
    
    setDarkTheme(savedDarkTheme);
    setAnimations(savedAnimations);
    setNotificationSound(savedNotificationSound);
  }, []);

  const handleThemeToggle = (checked: boolean) => {
    setDarkTheme(checked);
    localStorage.setItem('darkTheme', checked.toString());
    
    // Aplicar tema escuro no documento
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast({
      title: "Tema atualizado",
      description: `Tema ${checked ? 'escuro' : 'claro'} ativado!`,
    });
  };

  const handleAnimationsToggle = (checked: boolean) => {
    setAnimations(checked);
    localStorage.setItem('animations', checked.toString());
    
    // Aplicar ou remover classe de animações
    if (checked) {
      document.documentElement.style.setProperty('--transition-duration', '0.3s');
    } else {
      document.documentElement.style.setProperty('--transition-duration', '0s');
    }
    
    toast({
      title: "Animações atualizadas",
      description: `Animações ${checked ? 'ativadas' : 'desativadas'}!`,
    });
  };

  const handleNotificationSoundToggle = (checked: boolean) => {
    setNotificationSound(checked);
    localStorage.setItem('notificationSound', checked.toString());
    
    toast({
      title: "Som das notificações",
      description: `Som das notificações ${checked ? 'ativado' : 'desativado'}!`,
    });
  };

  return {
    darkTheme,
    animations,
    notificationSound,
    handleThemeToggle,
    handleAnimationsToggle,
    handleNotificationSoundToggle
  };
};
