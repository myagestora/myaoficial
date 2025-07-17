// Importa as bibliotecas necessárias no início do arquivo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { formatInTimeZone } from 'https://esm.sh/date-fns-tz@3.2.0';

// Define os cabeçalhos CORS para permitir o acesso à API.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Função auxiliar reutilizável para buscar assinaturas que expiram em uma data específica.
 * @param {object} supabase - O cliente Supabase inicializado.
 * @param {string} targetDate - A data de expiração no formato 'yyyy-MM-dd'.
 * @returns {Promise<Array>} - Uma promessa que resolve para uma lista de assinaturas.
 */
async function getSubscriptionsByExpirationDate(supabase, targetDate ) {
  const { data, error, count } = await supabase
    .from('user_subscriptions')
    .select(`
      id,
      current_period_end,
      subscription_plans ( name ),
      profiles ( full_name, whatsapp )
    `, { count: 'exact' }) // Adicionado para contagem precisa
    .eq('status', 'active')
    .not('current_period_end', 'is', null)
    .eq('current_period_end::date', targetDate);

  // LOG DE DIAGNÓSTICO: Mostra quantas assinaturas foram encontradas para a data.
  console.log(`[DIAGNÓSTICO] Busca por ${targetDate}: Encontrado ${count ?? 0} registros.`);

  if (error) {
    console.error(`Erro ao buscar assinaturas para a data ${targetDate}:`, error);
    return [];
  }
  
  if (!data) {
    return [];
  }

  return data.map(sub => ({
    subscription_id: sub.id,
    user_name: sub.profiles?.full_name || 'Nome não informado',
    phone: sub.profiles?.whatsapp || null,
    plan_name: sub.subscription_plans?.name || 'Plano não identificado',
    expiration_date: sub.current_period_end.split('T')[0],
  }));
}

/**
 * Função principal que orquestra a busca por assinaturas que estão expirando.
 * @param {object} supabase - O cliente Supabase inicializado.
 * @returns {Promise<object>} - O objeto de resposta final com as listas de assinaturas.
 */
async function handleExpiringSubscriptions(supabase) {
  const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
  const now = new Date();

  const todayBrazil = formatInTimeZone(now, BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  const in2DaysBrazil = formatInTimeZone(new Date(now.getTime() + 2 * 86400000), BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  const in5DaysBrazil = formatInTimeZone(new Date(now.getTime() + 5 * 86400000), BRAZIL_TIMEZONE, 'yyyy-MM-dd');
  const in10DaysBrazil = formatInTimeZone(new Date(now.getTime() + 10 * 86400000), BRAZIL_TIMEZONE, 'yyyy-MM-dd');

  console.log('Buscando assinaturas para as seguintes datas (fuso de Brasília):');
  console.log(`- Hoje: ${todayBrazil}`);
  console.log(`- Em 2 dias: ${in2DaysBrazil}`);
  console.log(`- Em 5 dias: ${in5DaysBrazil}`);
  console.log(`- Em 10 dias: ${in10DaysBrazil}`);

  const [
    expiringToday,
    expiringIn2Days,
    expiringIn5Days,
    expiringIn10Days
  ] = await Promise.all([
    getSubscriptionsByExpirationDate(supabase, todayBrazil),
    getSubscriptionsByExpirationDate(supabase, in2DaysBrazil),
    getSubscriptionsByExpirationDate(supabase, in5DaysBrazil),
    getSubscriptionsByExpirationDate(supabase, in10DaysBrazil)
  ]);

  const totalExpiring = expiringToday.length + expiringIn2Days.length + expiringIn5Days.length + expiringIn10Days.length;

  return {
    expiring_today: expiringToday,
    expiring_in_2_days: expiringIn2Days,
    expiring_in_5_days: expiringIn5Days,
    expiring_in_10_days: expiringIn10Days,
    total_expiring: totalExpiring
  };
}

// Ponto de entrada principal da Edge Function.
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // A validação da API Key está aqui, exatamente como no seu código original.
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Chave de API inválida ou inativa:', apiKey);
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    console.log('Processando requisição de assinaturas a expirar...');
    
    const result = await handleExpiringSubscriptions(supabase);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});