const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionExpiringResponse {
  subscription_id: string;
  user_name: string;
  phone: string | null;
  plan_name: string;
  expiration_date: string;
  days_until_expiration: number;
}

interface ExpiringResult {
  expiring_today: SubscriptionExpiringResponse[];
  expiring_in_2_days: SubscriptionExpiringResponse[];
  expiring_in_5_days: SubscriptionExpiringResponse[];
  expiring_in_10_days: SubscriptionExpiringResponse[];
  total_expiring: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Validate API key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
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
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Invalid API key:', apiKey);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    console.log('Processing expiring subscriptions request');
    
    const result = await handleExpiringSubscriptions(supabase);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in subscription-expiring-api:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleExpiringSubscriptions(supabase: any): Promise<ExpiringResult> {
  // Get current date (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Calculate target dates
  const in2Days = new Date(today);
  in2Days.setUTCDate(today.getUTCDate() + 2);
  
  const in5Days = new Date(today);
  in5Days.setUTCDate(today.getUTCDate() + 5);
  
  const in10Days = new Date(today);
  in10Days.setUTCDate(today.getUTCDate() + 10);

  // Query active subscriptions expiring in the next 10 days
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      current_period_end,
      subscription_plans (
        name
      ),
      profiles (
        full_name,
        whatsapp
      )
    `)
    .eq('status', 'active')
    .not('current_period_end', 'is', null)
    .gte('current_period_end', today.toISOString().split('T')[0])
    .lte('current_period_end', in10Days.toISOString().split('T')[0]);

  if (subscriptionsError) {
    console.error('Error fetching expiring subscriptions:', subscriptionsError);
    throw new Error('Failed to fetch expiring subscriptions');
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No expiring subscriptions found');
    return {
      expiring_today: [],
      expiring_in_2_days: [],
      expiring_in_5_days: [],
      expiring_in_10_days: [],
      total_expiring: 0
    };
  }

  console.log(`Found ${subscriptions.length} expiring subscriptions (next 10 days)`);

  // Process and categorize subscriptions
  const expiringToday: SubscriptionExpiringResponse[] = [];
  const expiringIn2Days: SubscriptionExpiringResponse[] = [];
  const expiringIn5Days: SubscriptionExpiringResponse[] = [];
  const expiringIn10Days: SubscriptionExpiringResponse[] = [];

  subscriptions.forEach(subscription => {
    if (!subscription.current_period_end) return;

    const expirationDate = new Date(subscription.current_period_end);
    expirationDate.setUTCHours(0, 0, 0, 0);
    
    const timeDiff = expirationDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const subscriptionData: SubscriptionExpiringResponse = {
      subscription_id: subscription.id,
      user_name: subscription.profiles?.full_name || 'Nome não informado',
      phone: subscription.profiles?.whatsapp || null,
      plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
      expiration_date: subscription.current_period_end.split('T')[0],
      days_until_expiration: daysDiff
    };

    // Categorize by expiration timeframe
    if (daysDiff === 0) {
      expiringToday.push(subscriptionData);
    } else if (daysDiff === 2) {
      expiringIn2Days.push(subscriptionData);
    } else if (daysDiff === 5) {
      expiringIn5Days.push(subscriptionData);
    } else if (daysDiff === 10) {
      expiringIn10Days.push(subscriptionData);
    }
  });

  const totalExpiring = expiringToday.length + expiringIn2Days.length + expiringIn5Days.length + expiringIn10Days.length;

  console.log(`Categorized expiring subscriptions: Today(${expiringToday.length}), 2days(${expiringIn2Days.length}), 5days(${expiringIn5Days.length}), 10days(${expiringIn10Days.length})`);

  return {
    expiring_today: expiringToday,
    expiring_in_2_days: expiringIn2Days,
    expiring_in_5_days: expiringIn5Days,
    expiring_in_10_days: expiringIn10Days,
    total_expiring: totalExpiring
  };
}