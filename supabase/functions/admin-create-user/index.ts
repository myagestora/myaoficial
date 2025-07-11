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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', { _user_id: user.id })
    
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied: admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, fullName, whatsapp, subscriptionStatus = 'inactive', planId } = await req.json()

    // Validate required fields
    if (!email || !password || !fullName) {
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
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email,
          full_name: fullName,
          whatsapp: whatsapp || null,
          subscription_status: subscriptionStatus,
          admin_override_status: true,
          account_status: 'active'
        })

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        throw profileError
      }

      console.log('✅ Profile created')

      // Create user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: 'user'
        })

      if (roleError) {
        console.error('❌ Role creation failed:', roleError)
        // Clean up
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        throw roleError
      }

      console.log('✅ User role created')

      // Create subscription if needed
      if (planId && subscriptionStatus !== 'inactive') {
        const { error: subscriptionError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: authUser.user.id,
            plan_id: planId,
            status: subscriptionStatus,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: 'monthly'
          })

        if (subscriptionError) {
          console.error('❌ Subscription creation failed:', subscriptionError)
          // Clean up
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          throw subscriptionError
        }

        console.log('✅ Subscription created')
      }

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