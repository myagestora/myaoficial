import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('🚀 Function started - Method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Processing POST request...');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🔧 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing environment variables' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase admin client created');

    // Get and verify authorization
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No authorization header' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Verifying user token...');
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('❌ Token verification failed:', userError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication token' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    console.log('✅ User verified:', userData.user.email);

    // Check admin permissions
    console.log('👮 Checking admin permissions...');
    const { data: isAdminResult, error: adminError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: userData.user.id });

    if (adminError) {
      console.error('❌ Admin check failed:', adminError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Admin verification failed: ${adminError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    if (!isAdminResult) {
      console.error('❌ User is not admin');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access denied: only administrators can create users' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    console.log('✅ Admin verification passed');

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('📦 Request body parsed:', { 
        email: body.email, 
        fullName: body.fullName,
        hasPassword: !!body.password,
        subscriptionStatus: body.subscriptionStatus 
      });
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { email, password, fullName, whatsapp, subscriptionStatus, planId } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, and fullName are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('👤 Creating user in auth...');

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        whatsapp: whatsapp || null
      },
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${authError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    if (!authData.user) {
      console.error('❌ No user data returned from auth');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create user - no user data returned' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create user profile
    console.log('📋 Creating user profile...');
    const { data: profileData, error: profileError } = await supabaseAdmin.rpc('admin_create_user_profile', {
      p_user_id: authData.user.id,
      p_email: email,
      p_full_name: fullName,
      p_whatsapp: whatsapp || null,
      p_subscription_status: subscriptionStatus || 'inactive',
      p_plan_id: planId || null
    });

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message);
      // Clean up auth user if profile creation fails
      console.log('🧹 Cleaning up auth user...');
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup auth user:', cleanupError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user profile: ${profileError.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('📋 Profile creation result:', profileData);

    // Check if profile creation was successful
    // The function might return a JSON object or boolean true
    const isProfileSuccess = profileData === true || 
                            (typeof profileData === 'object' && profileData !== null && (profileData as any).success === true);

    if (!isProfileSuccess) {
      console.error('❌ Profile creation returned failure:', profileData);
      // Clean up auth user
      console.log('🧹 Cleaning up auth user...');
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup auth user:', cleanupError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: (profileData as any)?.error || 'Failed to create user profile' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('✅ User profile created successfully');

    const response = {
      success: true,
      user_id: authData.user.id,
      message: 'User created successfully'
    };

    console.log('🎉 Returning success response');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});