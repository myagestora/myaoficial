
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  console.log('=== WEBHOOK MERCADO PAGO INICIADO ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Obter dados do webhook
    const body = await req.text();
    console.log('Body recebido:', body);
    
    if (!body) {
      console.error('Body vazio recebido');
      return new Response(JSON.stringify({ 
        error: 'Body vazio',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let webhookData;
    try {
      webhookData = JSON.parse(body);
      console.log('Dados parseados:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'JSON inválido',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verificar se é evento de pagamento
    const isPaymentEvent = webhookData.type === 'payment' || 
                          webhookData.action === 'payment.updated' ||
                          webhookData.action === 'payment.created';

    if (!isPaymentEvent) {
      console.log('Evento não é de pagamento, ignorando:', webhookData.type || webhookData.action);
      return new Response(JSON.stringify({ 
        received: true,
        processed: false,
        message: 'Evento não processado - não é de pagamento'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('=== PROCESSANDO EVENTO DE PAGAMENTO ===');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar token do Mercado Pago
    console.log('Buscando token do Mercado Pago...');
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError || !configData) {
      console.error('Erro ao buscar token:', configError);
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago não encontrado',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const accessToken = typeof configData.value === 'string' ? 
      configData.value.replace(/^"|"$/g, '') : 
      JSON.stringify(configData.value).replace(/^"|"$/g, '');

    console.log('Token encontrado:', accessToken ? 'SIM' : 'NÃO');

    // Obter ID do pagamento
    const paymentId = webhookData.data?.id || webhookData.id;
    
    if (!paymentId) {
      console.error('ID do pagamento não encontrado');
      return new Response(JSON.stringify({ 
        error: 'ID do pagamento não encontrado',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Payment ID:', paymentId);

    // Buscar detalhes do pagamento no Mercado Pago
    console.log('Buscando pagamento no Mercado Pago...');
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Erro ao buscar pagamento:', paymentResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `Erro ${paymentResponse.status} ao buscar pagamento`,
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const paymentData = await paymentResponse.json();
    console.log('Dados do pagamento MP:', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference
    });

    // Buscar pagamento no banco
    console.log('Buscando pagamento no banco de dados...');
    let paymentRecord = null;

    // Buscar pelo payment_id
    const { data: paymentByMpId, error: errorByMpId } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('mercado_pago_payment_id', paymentData.id.toString())
      .maybeSingle();

    if (errorByMpId) {
      console.error('Erro ao buscar por MP ID:', errorByMpId);
    } else if (paymentByMpId) {
      console.log('Pagamento encontrado por MP ID');
      paymentRecord = paymentByMpId;
    }

    // Se não encontrou, buscar por external_reference
    if (!paymentRecord && paymentData.external_reference) {
      console.log('Buscando por external_reference:', paymentData.external_reference);
      
      const { data: paymentByRef, error: errorByRef } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('mercado_pago_preference_id', paymentData.external_reference)
        .maybeSingle();

      if (errorByRef) {
        console.error('Erro ao buscar por external_reference:', errorByRef);
      } else if (paymentByRef) {
        console.log('Pagamento encontrado por external_reference');
        paymentRecord = paymentByRef;
      }
    }

    if (!paymentRecord) {
      console.error('Pagamento não encontrado no banco');
      return new Response(JSON.stringify({ 
        error: 'Pagamento não encontrado no banco de dados',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log('Pagamento encontrado no banco:', paymentRecord.id);

    // Determinar novo status
    let newStatus = 'pending';
    if (paymentData.status === 'approved') {
      newStatus = 'completed';
    } else if (paymentData.status === 'rejected') {
      newStatus = 'failed';
    } else if (paymentData.status === 'cancelled') {
      newStatus = 'cancelled';
    }

    console.log('Atualizando status para:', newStatus);

    // Atualizar pagamento
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: newStatus,
        mercado_pago_payment_id: paymentData.id.toString(),
        payment_date: paymentData.date_approved || paymentData.date_created,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Erro ao atualizar pagamento:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao atualizar pagamento',
        received: true,
        processed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Pagamento atualizado com sucesso');

    // Se aprovado, ativar assinatura
    if (paymentData.status === 'approved') {
      console.log('Ativando assinatura do usuário...');
      
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Verificar assinatura existente
      const { data: existingSubscription } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', paymentRecord.user_id)
        .eq('plan_id', paymentRecord.plan_id)
        .maybeSingle();

      if (existingSubscription) {
        // Atualizar assinatura existente
        const { error: subscriptionError } = await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);

        if (subscriptionError) {
          console.error('Erro ao atualizar assinatura:', subscriptionError);
        } else {
          console.log('Assinatura atualizada');
        }
      } else {
        // Criar nova assinatura
        const { error: subscriptionError } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id: paymentRecord.user_id,
            plan_id: paymentRecord.plan_id,
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (subscriptionError) {
          console.error('Erro ao criar assinatura:', subscriptionError);
        } else {
          console.log('Assinatura criada');
        }
      }

      // Atualizar perfil
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.user_id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      } else {
        console.log('Perfil atualizado');
      }
    }

    console.log('=== WEBHOOK PROCESSADO COM SUCESSO ===');
    
    return new Response(JSON.stringify({ 
      received: true,
      processed: true,
      status: newStatus,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO GERAL NO WEBHOOK ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      received: true,
      processed: false,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
