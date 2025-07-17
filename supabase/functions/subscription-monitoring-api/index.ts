import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionMonitoringResponse {
  user_name: string | null;
  phone: string | null;
  plan_name: string;
  frequency: string | null;
  expiration_date: string | null;
  days_difference: number;
  status: string | null;
  subscription_id: string;
}

interface MonitoringResult {
  expiring_today: SubscriptionMonitoringResponse[];
  expiring_in_2_days: SubscriptionMonitoringResponse[];
  expiring_in_5_days: SubscriptionMonitoringResponse[];
  expiring_in_10_days: SubscriptionMonitoringResponse[];
  expired_1_day: SubscriptionMonitoringResponse[];
  expired_2_days: SubscriptionMonitoringResponse[];
  expired_5_days: SubscriptionMonitoringResponse[];
  expired_10_days: SubscriptionMonitoringResponse[];
  total_counts: {
    expiring_soon: number;
    expired: number;
    total: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate API Key
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.log('Invalid API key:', apiKey.substring(0, 10) + '...');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update last_used for the API key
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    console.log('API key validated successfully');

    // Query to get subscription monitoring data (only active subscriptions)
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        current_period_end,
        frequency,
        status,
        subscription_plans (
          name
        ),
        profiles (
          full_name,
          whatsapp
        )
      `)
      .eq('status', 'active')
      .not('current_period_end', 'is', null);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions to process`);

    // Get current date (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Initialize result structure
    const result: MonitoringResult = {
      expiring_today: [],
      expiring_in_2_days: [],
      expiring_in_5_days: [],
      expiring_in_10_days: [],
      expired_1_day: [],
      expired_2_days: [],
      expired_5_days: [],
      expired_10_days: [],
      total_counts: {
        expiring_soon: 0,
        expired: 0,
        total: 0
      }
    };

    // Process each subscription
    for (const subscription of subscriptions) {
      const expirationDate = new Date(subscription.current_period_end);
      expirationDate.setUTCHours(0, 0, 0, 0);
      
      const daysDifference = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const subscriptionData: SubscriptionMonitoringResponse = {
        subscription_id: subscription.id,
        user_name: subscription.profiles?.full_name || null,
        phone: subscription.profiles?.whatsapp || null,
        plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
        frequency: subscription.frequency === 'monthly' ? 'Mensal' : 
                  subscription.frequency === 'yearly' ? 'Anual' : 
                  subscription.frequency,
        expiration_date: subscription.current_period_end,
        days_difference: daysDifference,
        status: subscription.status
      };

      // Categorize by expiration status
      if (daysDifference === 0) {
        result.expiring_today.push(subscriptionData);
        result.total_counts.expiring_soon++;
      } else if (daysDifference === 2) {
        result.expiring_in_2_days.push(subscriptionData);
        result.total_counts.expiring_soon++;
      } else if (daysDifference === 5) {
        result.expiring_in_5_days.push(subscriptionData);
        result.total_counts.expiring_soon++;
      } else if (daysDifference === 10) {
        result.expiring_in_10_days.push(subscriptionData);
        result.total_counts.expiring_soon++;
      } else if (daysDifference === -1) {
        result.expired_1_day.push(subscriptionData);
        result.total_counts.expired++;
      } else if (daysDifference === -2) {
        result.expired_2_days.push(subscriptionData);
        result.total_counts.expired++;
      } else if (daysDifference === -5) {
        result.expired_5_days.push(subscriptionData);
        result.total_counts.expired++;
      } else if (daysDifference === -10) {
        result.expired_10_days.push(subscriptionData);
        result.total_counts.expired++;
      }
    }

    result.total_counts.total = result.total_counts.expiring_soon + result.total_counts.expired;

    console.log('Subscription monitoring completed:', {
      total: result.total_counts.total,
      expiring_soon: result.total_counts.expiring_soon,
      expired: result.total_counts.expired
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in subscription monitoring API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});