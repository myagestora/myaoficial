import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate API Key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    // Verify API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      console.log('❌ Invalid API key')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used timestamp for the API key
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('key', apiKey)

    // Parse request body
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      console.log('❌ Missing subscription_id parameter')
      return new Response(
        JSON.stringify({ success: false, error: 'subscription_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Processing suspension for subscription_id: ${subscription_id}`)

    // Find the subscription and get user info
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          account_status
        )
      `)
      .eq('id', subscription_id)
      .single()

    if (subscriptionError || !subscriptionData) {
      console.log(`❌ Subscription not found: ${subscription_id}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = subscriptionData.user_id
    const userProfile = subscriptionData.profiles

    console.log(`👤 Found user: ${userProfile?.full_name} (${userProfile?.email})`)
    console.log(`📊 Current subscription status: ${subscriptionData.status}`)
    console.log(`🔒 Current account status: ${userProfile?.account_status}`)

    // Update subscription status to 'canceled'
    const { error: subscriptionUpdateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id)

    if (subscriptionUpdateError) {
      console.log(`❌ Error updating subscription: ${subscriptionUpdateError.message}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile account status to 'suspended'
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ 
        account_status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.log(`❌ Error updating profile: ${profileUpdateError.message}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Account suspended successfully`)
    console.log(`📝 Subscription ${subscription_id} status changed to 'canceled'`)
    console.log(`🔒 User ${userId} account status changed to 'suspended'`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account suspended successfully',
        data: {
          subscription_id: subscription_id,
          user_id: userId,
          user_name: userProfile?.full_name,
          user_email: userProfile?.email,
          previous_subscription_status: subscriptionData.status,
          new_subscription_status: 'canceled',
          previous_account_status: userProfile?.account_status,
          new_account_status: 'suspended',
          suspended_at: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})