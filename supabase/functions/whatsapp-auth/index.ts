import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthRequest {
  whatsapp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate API key from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validate API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      console.log('Invalid API key:', apiKey);
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    const { whatsapp }: AuthRequest = await req.json()

    // Buscar usuário pelo WhatsApp
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, account_status, subscription_status')
      .eq('whatsapp', whatsapp)
      .eq('account_status', 'active')
      .single()

    if (error || !profile) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found or inactive',
          message: 'WhatsApp não encontrado ou usuário inativo'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Gerar token temporário (válido por 1 hora)
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Armazenar sessão temporária (você pode criar uma tabela para isso ou usar cache)
    // Por simplicidade, vamos retornar o user_id diretamente
    
    console.log(`WhatsApp authentication successful for user: ${profile.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: profile.id,
        user_name: profile.full_name,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        subscription_status: profile.subscription_status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('WhatsApp auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})