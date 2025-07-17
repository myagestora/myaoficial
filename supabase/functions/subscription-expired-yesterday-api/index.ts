const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionExpiredYesterdayResponse {
  subscription_id: string;
  user_name: string;
  phone: string | null;
  plan_name: string;
  expiration_date: string;
}

interface ExpiredYesterdayResult {
  expired_yesterday: SubscriptionExpiredYesterdayResponse[];
  total_count: number;
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

    console.log('Processing expired yesterday subscriptions request');
    
    const result = await handleExpiredYesterdaySubscriptions(supabase);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in subscription-expired-yesterday-api:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleExpiredYesterdaySubscriptions(supabase: any): Promise<ExpiredYesterdayResult> {
  // Calculate yesterday's date range in Brazilian timezone
  const { formatInTimeZone } = await import('https://esm.sh/date-fns-tz@3.2.0');
  
  const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
  
  // Get current time in Brazil
  const now = new Date();
  const brazilToday = formatInTimeZone(now, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  // Calculate yesterday in Brazilian timezone
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const brazilYesterday = formatInTimeZone(yesterday, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  
  // Create range for yesterday (start of yesterday to start of today in Brazilian timezone)
  const yesterdayStart = `${brazilYesterday}T00:00:00-03:00`;
  const todayStart = `${brazilToday}T00:00:00-03:00`;

  console.log(`Looking for subscriptions that expired on: ${brazilYesterday}`);
  console.log(`Date range: ${yesterdayStart} to ${todayStart}`);

  // Query active subscriptions that expired yesterday using date range
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
    .gte('current_period_end', yesterdayStart)
    .lt('current_period_end', todayStart);

  if (subscriptionsError) {
    console.error('Error fetching expired yesterday subscriptions:', subscriptionsError);
    throw new Error('Failed to fetch expired yesterday subscriptions');
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No subscriptions expired yesterday');
    return {
      expired_yesterday: [],
      total_count: 0
    };
  }

  console.log(`Found ${subscriptions.length} subscriptions that expired yesterday`);

  // Process subscriptions
  const expiredYesterday: SubscriptionExpiredYesterdayResponse[] = subscriptions.map(subscription => ({
    subscription_id: subscription.id,
    user_name: subscription.profiles?.full_name || 'Nome não informado',
    phone: subscription.profiles?.whatsapp || null,
    plan_name: subscription.subscription_plans?.name || 'Plano não identificado',
    expiration_date: subscription.current_period_end
  }));

  return {
    expired_yesterday: expiredYesterday,
    total_count: expiredYesterday.length
  };
}