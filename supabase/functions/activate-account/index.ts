import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, name, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      console.log('Invalid or inactive API key:', apiKey);
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
      .eq('id', keyData.id);

    console.log('API key validated successfully:', keyData.name);

    // Parse request body
    const body = await req.json();
    const { subscription_id } = body;

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Activating account for subscription:', subscription_id);

    // Get subscription and user data
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        status,
        current_period_start,
        current_period_end,
        profiles!inner(
          id,
          full_name,
          email,
          account_status
        )
      `)
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      console.log('Subscription not found:', subscription_id, subError);
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const profile = subscription.profiles;

    // Check if account is actually suspended
    if (subscription.status !== 'canceled' || profile.account_status !== 'suspended') {
      console.log('Account is not suspended:', {
        subscription_status: subscription.status,
        account_status: profile.account_status
      });
      return new Response(
        JSON.stringify({ 
          error: 'Account is not suspended',
          current_subscription_status: subscription.status,
          current_account_status: profile.account_status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Account is suspended, proceeding with activation:', {
      user_id: subscription.user_id,
      user_name: profile.full_name,
      user_email: profile.email
    });

    // Update subscription status to active
    const { error: updateSubError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id);

    if (updateSubError) {
      console.error('Error updating subscription:', updateSubError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update user account status to active
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ 
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.user_id);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user account status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Account activated successfully:', {
      subscription_id,
      user_id: subscription.user_id,
      user_name: profile.full_name,
      user_email: profile.email
    });

    const activatedAt = new Date().toISOString();
    const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        data: {
          subscription_id,
          user_id: subscription.user_id,
          user_name: profile.full_name,
          user_email: profile.email,
          previous_subscription_status: 'canceled',
          new_subscription_status: 'active',
          previous_account_status: 'suspended',
          new_account_status: 'active',
          activated_at: activatedAt,
          new_period_end: newPeriodEnd
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in activate-account function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});