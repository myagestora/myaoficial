
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização necessário");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Usuário não autenticado");
    }

    const { planId, subscriptionFrequency } = await req.json();
    
    if (!planId || !subscriptionFrequency) {
      throw new Error("planId e subscriptionFrequency são obrigatórios");
    }

    console.log('Criando assinatura para:', { userId: userData.user.id, planId, subscriptionFrequency });

    // Buscar configurações do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .in('key', ['mercado_pago_access_token', 'mercado_pago_enabled']);

    if (configError) throw configError;

    const config: Record<string, string> = {};
    configData.forEach(item => {
      config[item.key] = typeof item.value === 'string' ? 
        item.value.replace(/^"|"$/g, '') : 
        JSON.stringify(item.value).replace(/^"|"$/g, '');
    });

    if (config.mercado_pago_enabled !== 'true') {
      throw new Error("Mercado Pago não está habilitado");
    }

    if (!config.mercado_pago_access_token) {
      throw new Error("Token do Mercado Pago não configurado");
    }

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error("Plano não encontrado");
    }

    const amount = subscriptionFrequency === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (!amount) {
      throw new Error("Preço não definido para este tipo de cobrança");
    }

    // Criar assinatura no Mercado Pago
    const subscriptionData = {
      reason: `${plan.name} - ${subscriptionFrequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      auto_recurring: {
        frequency: subscriptionFrequency === 'monthly' ? 1 : 12,
        frequency_type: "months",
        transaction_amount: parseFloat(amount.toString()),
        currency_id: "BRL"
      },
      payer_email: userData.user.email,
      back_url: `${req.headers.get("origin")}/subscription/success`,
      external_reference: `${userData.user.id}_${planId}_${Date.now()}`
    };

    console.log('Enviando dados para o Mercado Pago:', subscriptionData);

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.mercado_pago_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!mercadoPagoResponse.ok) {
      const errorData = await mercadoPagoResponse.text();
      console.error('Erro do Mercado Pago:', errorData);
      throw new Error('Erro ao criar assinatura no Mercado Pago');
    }

    const subscription = await mercadoPagoResponse.json();
    console.log('Assinatura criada:', subscription);

    // Salvar assinatura no banco (como pendente)
    const { error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_id: planId,
        frequency: subscriptionFrequency,
        status: 'inactive', // Será ativado quando o pagamento for confirmado
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (subscriptionFrequency === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subscriptionError) {
      console.error('Erro ao salvar assinatura:', subscriptionError);
    }

    // Salvar pagamento inicial no banco
    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: userData.user.id,
        plan_id: planId,
        amount: amount,
        currency: 'BRL',
        payment_method: 'mercado_pago',
        mercado_pago_preference_id: subscription.id,
        status: 'pending'
      });

    if (paymentError) {
      console.error('Erro ao salvar pagamento:', paymentError);
    }

    return new Response(JSON.stringify({
      subscription_id: subscription.id,
      init_point: subscription.init_point,
      status: subscription.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
