
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePreferences = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [animations, setAnimations] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [expenseReminders, setExpenseReminders] = useState(true);

  // Effect para carregar preferências do usuário
  useEffect(() => {
    const loadPreferences = async () => {
      // Carregar preferências salvas no localStorage
      const savedAnimations = localStorage.getItem('animations') !== 'false'; // padrão true
      const savedNotificationSound = localStorage.getItem('notificationSound') !== 'false'; // padrão true
      setAnimations(savedAnimations);
      setNotificationSound(savedNotificationSound);

      // Carregar preferência de lembretes do banco de dados
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('expense_reminders_enabled')
          .eq('id', user.id)
          .single();
        if (profile) {
          setExpenseReminders(profile.expense_reminders_enabled ?? true);
        }
      }
    };
    loadPreferences();
  }, [user]);

  const handleAnimationsToggle = (checked: boolean) => {
    setAnimations(checked);
    localStorage.setItem('animations', checked.toString());
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

  const handleExpenseRemindersToggle = async (checked: boolean) => {
    setExpenseReminders(checked);
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ expense_reminders_enabled: checked })
        .eq('id', user.id);
      if (error) {
        setExpenseReminders(!checked);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a preferência.",
          variant: "destructive",
        });
        return;
      }
    }
    toast({
      title: "Lembretes de despesas",
      description: `Lembretes de despesas ${checked ? 'ativados' : 'desativados'}!`,
    });
  };

  return {
    animations,
    notificationSound,
    expenseReminders,
    handleAnimationsToggle,
    handleNotificationSoundToggle,
    handleExpenseRemindersToggle
  };
};
