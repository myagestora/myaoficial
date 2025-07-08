
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionWithProfile, ProfileData } from '@/types/subscription';

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async (): Promise<SubscriptionWithProfile[]> => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            description,
            price_monthly,
            price_yearly
          ),
          profiles!user_subscriptions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('Join failed, trying separate queries:', error);
        
        const { data: subscriptionsData, error: subsError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (
              name,
              description,
              price_monthly,
              price_yearly
            )
          `)
          .order('created_at', { ascending: false });
        
        if (subsError) throw subsError;
        
        const userIds = subscriptionsData?.map(sub => sub.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;
        
        const combinedData: SubscriptionWithProfile[] = subscriptionsData?.map(subscription => ({
          id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          status: subscription.status || 'inactive',
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created_at: subscription.created_at || '',
          updated_at: subscription.updated_at || '',
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
          subscription_plans: subscription.subscription_plans,
          profiles: profilesData?.find(profile => profile.id === subscription.user_id) || null
        })) || [];
        
        return combinedData;
      }
      
      const transformedData: SubscriptionWithProfile[] = data?.map(subscription => {
        const profilesData = subscription.profiles;
        let validProfile: ProfileData | null = null;
        
        // Check if profilesData exists and is a valid object with required properties
        if (profilesData && 
            typeof profilesData === 'object' &&
            !Array.isArray(profilesData) &&
            'id' in profilesData && 
            'full_name' in profilesData && 
            'email' in profilesData &&
            !('error' in profilesData)) {
          // Type assertion after we've verified the structure
          const profile = profilesData as { id: string; full_name: string | null; email: string | null };
          validProfile = {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email
          };
        }
        
        return {
          id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          status: subscription.status || 'inactive',
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created_at: subscription.created_at || '',
          updated_at: subscription.updated_at || '',
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
          subscription_plans: subscription.subscription_plans,
          profiles: validProfile
        };
      }) || [];
      
      return transformedData;
    }
  });
};
