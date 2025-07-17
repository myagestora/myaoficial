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

    // Get the URL to determine the endpoint
    const url = new URL(req.url);
    const path = url.pathname;

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

    // Route to appropriate handler
    if (path.endsWith('/past-due')) {
      return await handlePastDueSubscriptions(supabase);
    } else {
      return await handleSubscriptionMonitoring(supabase);
    }

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

// Handler for subscription monitoring (active subscriptions)
async function handleSubscriptionMonitoring(supabase: any) {
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
}

// Handler for past due subscriptions
async function handlePastDueSubscriptions(supabase: any) {
  // Calculate date 30 days ago
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);
  
  // Query to get past due subscriptions (expired within last 30 days)
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
    .eq('status', 'past_due')
    .not('current_period_end', 'is', null)
    .gte('current_period_end', thirtyDaysAgo.toISOString().split('T')[0])
    .lte('current_period_end', today.toISOString().split('T')[0]);

  if (subscriptionsError) {
    console.error('Error fetching past due subscriptions:', subscriptionsError);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch past due subscriptions' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`Found ${subscriptions.length} past due subscriptions (last 30 days)`);

  // Process each subscription to calculate days overdue
  const pastDueSubscriptions = subscriptions.map(subscription => {
    const expirationDate = new Date(subscription.current_period_end);
    expirationDate.setUTCHours(0, 0, 0, 0);
    
    const daysOverdue = Math.floor((today.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      subscription_id: subscription.id,
      user_name: subscription.profiles?.full_name || null,
      phone: subscription.profiles?.whatsapp || null,
      plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
      frequency: subscription.frequency === 'monthly' ? 'Mensal' : 
                subscription.frequency === 'yearly' ? 'Anual' : 
                subscription.frequency,
      expiration_date: subscription.current_period_end,
      days_overdue: daysOverdue > 0 ? daysOverdue : 0,
      status: subscription.status
    };
  });

  const result = {
    past_due_subscriptions: pastDueSubscriptions,
    total_count: pastDueSubscriptions.length
  };

  console.log('Past due subscriptions query completed:', {
    total_count: result.total_count
  });

  return new Response(
    JSON.stringify(result),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}