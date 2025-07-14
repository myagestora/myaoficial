import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useExpenseReminders = () => {
  const { user } = useAuth();

  const checkExpenseReminders = async () => {
    if (!user?.id) return;

    try {
      // Call the check-expense-reminders edge function
      const { data, error } = await supabase.functions.invoke('check-expense-reminders', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('Error checking expense reminders:', error);
        return;
      }

      console.log('Expense reminders check result:', data);
    } catch (error) {
      console.error('Error invoking expense reminders function:', error);
    }
  };

  // Check for expense reminders when user logs in
  useEffect(() => {
    if (user?.id) {
      // Small delay to ensure user is fully authenticated
      setTimeout(() => {
        checkExpenseReminders();
      }, 1000);
    }
  }, [user?.id]);

  return {
    checkExpenseReminders
  };
};