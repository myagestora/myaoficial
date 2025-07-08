
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSubscription = () => {
  const { user } = useAuth();

  const {
    data: subscription,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            description,
            features,
            price_monthly,
            price_yearly
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasActiveSubscription = !!subscription;
  
  const isSubscriptionActive = (status?: string) => {
    return status === 'active';
  };

  return {
    subscription,
    hasActiveSubscription,
    isSubscriptionActive,
    isLoading,
    error,
    refetch
  };
};
