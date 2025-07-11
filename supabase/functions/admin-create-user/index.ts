import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Admin create user function started');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    console.log('✅ Environment variables loaded');

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Verifying user token...');
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('❌ Invalid token:', userError);
      throw new Error('Invalid authentication token');
    }

    console.log('✅ User verified:', userData.user.email);

    // Check if user is admin
    console.log('🔍 Checking admin privileges...');
    const { data: isAdminData, error: adminError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: userData.user.id });

    if (adminError) {
      console.error('❌ Admin check error:', adminError);
      throw new Error(`Admin verification failed: ${adminError.message}`);
    }

    if (!isAdminData) {
      console.error('❌ User is not admin');
      throw new Error('Access denied: only administrators can create users');
    }

    console.log('✅ Admin verification passed');

    // Parse request body
    const body = await req.json();
    const { email, password, fullName, whatsapp, subscriptionStatus, planId } = body;

    console.log('📝 Request body parsed:', { email, fullName, subscriptionStatus });

    if (!email || !password || !fullName) {
      console.error('❌ Missing required fields');
      throw new Error('Missing required fields: email, password, and fullName are required');
    }

    console.log('📧 Creating user:', email);

    // Step 1: Create user in auth.users using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        whatsapp: whatsapp || null
      },
      email_confirm: true // Auto-confirm email for admin-created users
    });

    if (authError) {
      console.error('❌ Auth user creation error:', authError);
      throw new Error(`Failed to create user in authentication: ${authError.message}`);
    }

    if (!authData.user) {
      console.error('❌ No user data returned');
      throw new Error('Failed to create user - no user data returned');
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Create user profile using the admin function
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
      console.error('❌ Profile creation error:', profileError);
      // If profile creation fails, we should clean up the auth user
      console.log('🧹 Cleaning up auth user...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    if (!(profileData as any)?.success) {
      console.error('❌ Profile creation failed:', profileData);
      // If profile creation fails, clean up the auth user
      console.log('🧹 Cleaning up auth user...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error((profileData as any)?.error || 'Failed to create user profile');
    }

    console.log('✅ User profile created successfully');

    const response = {
      success: true,
      user_id: authData.user.id,
      message: 'User created successfully'
    };

    console.log('✅ Returning success response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error in admin-create-user:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };

    console.log('❌ Returning error response:', errorResponse);
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});