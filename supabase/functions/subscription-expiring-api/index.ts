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
  // Calculate dates in Brazilian timezone
  const { formatInTimeZone } = await import('https://esm.sh/date-fns-tz@3.2.0');
  const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
  
  const now = new Date();
  
  // Calculate exact target dates in Brazilian timezone
  const todayBrazil = formatInTimeZone(now, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  const in2DaysDate = new Date(now);
  in2DaysDate.setDate(in2DaysDate.getDate() + 2);
  const in2DaysBrazil = formatInTimeZone(in2DaysDate, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  const in5DaysDate = new Date(now);
  in5DaysDate.setDate(in5DaysDate.getDate() + 5);
  const in5DaysBrazil = formatInTimeZone(in5DaysDate, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  const in10DaysDate = new Date(now);
  in10DaysDate.setDate(in10DaysDate.getDate() + 10);
  const in10DaysBrazil = formatInTimeZone(in10DaysDate, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  console.log(`Target dates (Brazil timezone):`);
  console.log(`Today: ${todayBrazil}`);
  console.log(`2 days: ${in2DaysBrazil}`);
  console.log(`5 days: ${in5DaysBrazil}`);
  console.log(`10 days: ${in10DaysBrazil}`);
  console.log(`10 days length: ${in10DaysBrazil.length}`);
  console.log(`Function redeployed at: ${new Date().toISOString()}`);

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
    .gte('current_period_end::date', todayBrazil)
    .lte('current_period_end::date', in10DaysBrazil);

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

    // Get expiration date (only date part, no time)
    const expirationDateString = subscription.current_period_end.split('T')[0];
    
    // Calculate days difference using Brazilian timezone
    const expirationDate = new Date(expirationDateString + 'T00:00:00');
    const todayDate = new Date(todayBrazil + 'T00:00:00');
    const timeDiff = expirationDate.getTime() - todayDate.getTime();
    const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    const subscriptionData: SubscriptionExpiringResponse = {
      subscription_id: subscription.id,
      user_name: subscription.profiles?.full_name || 'Nome não informado',
      phone: subscription.profiles?.whatsapp || null,
      plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
      expiration_date: expirationDateString,
      days_until_expiration: daysDiff
    };

    console.log(`Subscription ${subscription.id}: expires ${expirationDateString}, ${daysDiff} days from today`);

    // Debug specific comparisons for troubleshooting
    if (expirationDateString === '2025-07-27') {
      console.log(`*** SPECIAL DEBUG FOR 2025-07-27 ***`);
      console.log(`expirationDateString: "${expirationDateString}" (length: ${expirationDateString.length})`);
      console.log(`in10DaysBrazil: "${in10DaysBrazil}" (length: ${in10DaysBrazil.length})`);
      console.log(`Are they equal? ${expirationDateString === in10DaysBrazil}`);
      console.log(`String comparison result: ${JSON.stringify(expirationDateString)} === ${JSON.stringify(in10DaysBrazil)}`);
    }

    // Categorize by exact expiration date with trimmed comparison
    const trimmedExpiration = expirationDateString.trim();
    const trimmedToday = todayBrazil.trim();
    const trimmed2Days = in2DaysBrazil.trim();
    const trimmed5Days = in5DaysBrazil.trim();
    const trimmed10Days = in10DaysBrazil.trim();

    if (trimmedExpiration === trimmedToday) {
      expiringToday.push(subscriptionData);
      console.log(`  -> Categorized as expiring TODAY`);
    } else if (trimmedExpiration === trimmed2Days) {
      expiringIn2Days.push(subscriptionData);
      console.log(`  -> Categorized as expiring in 2 DAYS`);
    } else if (trimmedExpiration === trimmed5Days) {
      expiringIn5Days.push(subscriptionData);
      console.log(`  -> Categorized as expiring in 5 DAYS`);
    } else if (trimmedExpiration === trimmed10Days) {
      expiringIn10Days.push(subscriptionData);
      console.log(`  -> Categorized as expiring in 10 DAYS`);
    } else {
      console.log(`  -> NOT categorized (expires on different date)`);
      console.log(`    Expected one of: ${trimmedToday}, ${trimmed2Days}, ${trimmed5Days}, ${trimmed10Days}`);
      console.log(`    Got: ${trimmedExpiration}`);
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