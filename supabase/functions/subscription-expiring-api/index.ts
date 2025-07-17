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

    console.log('Processing expiring subscriptions request - SIMPLIFIED VERSION');
    
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
  console.log('=== SIMPLIFIED EXPIRING SUBSCRIPTIONS HANDLER ===');
  
  // Get today's date (simple, no timezone complications)
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Calculate 10 days from today
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 10);
  const futureDateString = futureDate.toISOString().split('T')[0];
  
  console.log(`Searching for subscriptions expiring between ${todayString} and ${futureDateString}`);

  // Fetch subscriptions with raw SQL for precise date calculation
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
    .gte('current_period_end::date', todayString)
    .lte('current_period_end::date', futureDateString);

  if (subscriptionsError) {
    console.error('Error fetching expiring subscriptions:', subscriptionsError);
    throw new Error('Failed to fetch expiring subscriptions');
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No expiring subscriptions found in the specified date range');
    return {
      expiring_today: [],
      expiring_in_2_days: [],
      expiring_in_5_days: [],
      expiring_in_10_days: [],
      total_expiring: 0
    };
  }

  console.log(`Found ${subscriptions.length} subscriptions expiring within 10 days`);

  // Initialize result arrays
  const expiringToday: SubscriptionExpiringResponse[] = [];
  const expiringIn2Days: SubscriptionExpiringResponse[] = [];
  const expiringIn5Days: SubscriptionExpiringResponse[] = [];
  const expiringIn10Days: SubscriptionExpiringResponse[] = [];

  // Process each subscription
  subscriptions.forEach(subscription => {
    if (!subscription.current_period_end) {
      console.log(`Skipping subscription ${subscription.id} - no expiration date`);
      return;
    }

    // Get just the date part (YYYY-MM-DD) from the timestamp
    const expirationDate = new Date(subscription.current_period_end);
    const expirationDateString = expirationDate.toISOString().split('T')[0];
    
    // Calculate days difference (simple calculation)
    const expDateMs = new Date(expirationDateString + 'T00:00:00.000Z').getTime();
    const todayMs = new Date(todayString + 'T00:00:00.000Z').getTime();
    const daysDiff = Math.round((expDateMs - todayMs) / (1000 * 60 * 60 * 24));
    
    console.log(`\n--- Processing Subscription ---`);
    console.log(`User: ${subscription.profiles?.full_name || 'Unknown'}`);
    console.log(`Expiration Date: ${expirationDateString}`);
    console.log(`Today: ${todayString}`);
    console.log(`Days until expiration: ${daysDiff}`);

    const subscriptionData: SubscriptionExpiringResponse = {
      subscription_id: subscription.id,
      user_name: subscription.profiles?.full_name || 'Nome não informado',
      phone: subscription.profiles?.whatsapp || null,
      plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
      expiration_date: expirationDateString,
      days_until_expiration: daysDiff
    };

    // Simple categorization with clear logic
    if (daysDiff === 0) {
      expiringToday.push(subscriptionData);
      console.log(`✅ CATEGORIZED: TODAY (${daysDiff} days)`);
    } else if (daysDiff === 1 || daysDiff === 2) {
      expiringIn2Days.push(subscriptionData);
      console.log(`✅ CATEGORIZED: 2 DAYS (${daysDiff} days)`);
    } else if (daysDiff >= 3 && daysDiff <= 5) {
      expiringIn5Days.push(subscriptionData);
      console.log(`✅ CATEGORIZED: 5 DAYS (${daysDiff} days)`);
    } else if (daysDiff >= 6 && daysDiff <= 10) {
      expiringIn10Days.push(subscriptionData);
      console.log(`✅ CATEGORIZED: 10 DAYS (${daysDiff} days)`);
    } else {
      console.log(`❌ NOT CATEGORIZED: ${daysDiff} days (outside valid range)`);
    }
  });

  const totalExpiring = expiringToday.length + expiringIn2Days.length + expiringIn5Days.length + expiringIn10Days.length;

  console.log('\n=== FINAL RESULTS ===');
  console.log(`Today: ${expiringToday.length} subscriptions`);
  console.log(`2 Days: ${expiringIn2Days.length} subscriptions`);
  console.log(`5 Days: ${expiringIn5Days.length} subscriptions`);
  console.log(`10 Days: ${expiringIn10Days.length} subscriptions`);
  console.log(`Total: ${totalExpiring} subscriptions`);

  return {
    expiring_today: expiringToday,
    expiring_in_2_days: expiringIn2Days,
    expiring_in_5_days: expiringIn5Days,
    expiring_in_10_days: expiringIn10Days,
    total_expiring: totalExpiring
  };
}