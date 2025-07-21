import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar API key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'API key is required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('key', apiKey);

    let userId;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        userId = body.user_id;
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id parameter is required in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (req.method === 'POST') {
      // Buscar contas bancárias do usuário
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (accountsError) {
        return new Response(JSON.stringify({ error: 'Error fetching accounts' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Buscar cartões de crédito do usuário
      const { data: cards, error: cardsError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (cardsError) {
        return new Response(JSON.stringify({ error: 'Error fetching cards' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, accounts: accounts || [], cards: cards || [], total_accounts: accounts?.length || 0, total_cards: cards?.length || 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}); 