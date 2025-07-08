
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

    const { planId, billingType } = await req.json();
    
    if (!planId || !billingType) {
      throw new Error("planId e billingType são obrigatórios");
    }

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

    const amount = billingType === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (!amount) {
      throw new Error("Preço não definido para este tipo de cobrança");
    }

    // Criar preferência no Mercado Pago
    const preferenceData = {
      items: [{
        title: `${plan.name} - ${billingType === 'monthly' ? 'Mensal' : 'Anual'}`,
        description: plan.description || '',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(amount.toString())
      }],
      payer: {
        email: userData.user.email
      },
      back_urls: {
        success: `${req.headers.get("origin")}/subscription/success`,
        failure: `${req.headers.get("origin")}/subscription/failure`,
        pending: `${req.headers.get("origin")}/subscription/pending`
      },
      auto_return: "approved",
      external_reference: `${userData.user.id}_${planId}_${Date.now()}`,
      payment_methods: {
        excluded_payment_types: [],
        installments: billingType === 'yearly' ? 12 : 6
      }
    };

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.mercado_pago_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mercadoPagoResponse.ok) {
      const errorData = await mercadoPagoResponse.text();
      console.error('Erro do Mercado Pago:', errorData);
      throw new Error('Erro ao criar preferência no Mercado Pago');
    }

    const preference = await mercadoPagoResponse.json();

    // Salvar pagamento no banco
    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: userData.user.id,
        plan_id: planId,
        amount: amount,
        currency: 'BRL',
        payment_method: 'mercado_pago',
        mercado_pago_preference_id: preference.id,
        status: 'pending'
      });

    if (paymentError) {
      console.error('Erro ao salvar pagamento:', paymentError);
      // Não falha a operação, apenas loga o erro
    }

    return new Response(JSON.stringify({
      preference_id: preference.id,
      preference_url: preference.init_point
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
