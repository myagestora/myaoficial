import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    console.log('🔧 Environment check:', { 
      supabaseUrl: supabaseUrl ? 'OK' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'OK' : 'MISSING'
    })

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token received:', token.substring(0, 20) + '...')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Invalid token:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Check if user is admin
    console.log('🔍 Checking admin privileges for user:', user.id)
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id })
    
    console.log('🔍 Admin check result:', { isAdmin, adminError })
    
    if (adminError) {
      console.error('❌ Admin check error:', adminError)
      return new Response(
        JSON.stringify({ error: 'Admin check failed', details: adminError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!isAdmin) {
      console.error('❌ Access denied: user is not admin')
      return new Response(
        JSON.stringify({ error: 'Access denied: admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Admin privileges confirmed')

    // Parse request body
    const requestBody = await req.text()
    console.log('📦 Raw request body:', requestBody)
    
    let bodyData
    try {
      bodyData = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, whatsapp, subscriptionStatus = 'inactive', planId } = bodyData

    console.log('📋 Parsed request data:', {
      email,
      password: password ? '***' : 'MISSING',
      fullName,
      whatsapp,
      subscriptionStatus,
      planId
    })

    // Validate required fields
    if (!email || !password || !fullName) {
      console.error('❌ Missing required fields:', { email: !!email, password: !!password, fullName: !!fullName })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Creating user with email:', email)

    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        whatsapp: whatsapp || null
      }
    })

    if (authError || !authUser.user) {
      console.error('❌ Auth user creation failed:', authError)
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Auth user created:', authUser.user.id)

    try {
      // NÃO criar perfil nem user_role manualmente! Já é feito por trigger.

      // Create subscription if needed
      if (planId && subscriptionStatus !== 'inactive') {
        console.log('💳 Creating subscription for user:', authUser.user.id)
        console.log('💳 Plan ID:', planId)
        console.log('💳 Status:', subscriptionStatus)
        
        const subscriptionData = {
          user_id: authUser.user.id,
          plan_id: planId,
          status: subscriptionStatus,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          frequency: 'monthly'
        }
        
        console.log('💳 Subscription data:', subscriptionData)
        
        const { error: subscriptionError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert(subscriptionData)

        if (subscriptionError) {
          console.error('❌ Subscription creation failed:', subscriptionError)
          // Clean up
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          throw subscriptionError
        }

        console.log('✅ Subscription created')
      }

      console.log('🎉 User creation completed successfully')
      return new Response(
        JSON.stringify({
          success: true,
          user_id: authUser.user.id,
          message: 'Usuário criado com sucesso'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('❌ Error in user creation process:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to create user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ General error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})