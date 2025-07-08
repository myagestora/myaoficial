
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log('=== WEBHOOK MERCADO PAGO INICIADO ===');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Obter dados do webhook
    const body = await req.text();
    console.log('Body recebido:', body);
    
    let webhookData;
    try {
      webhookData = JSON.parse(body);
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

    console.log('Dados do webhook parseados:', JSON.stringify(webhookData, null, 2));

    // Buscar configurações do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError || !configData) {
      console.error('Erro ao buscar configurações:', configError);
      return new Response(JSON.stringify({ 
        error: 'Configurações do Mercado Pago não encontradas',
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

    console.log('Token configurado:', accessToken ? 'SIM' : 'NÃO');

    // Verificar se é um evento de pagamento
    const isPaymentEvent = webhookData.type === 'payment' || 
                          webhookData.action === 'payment.updated' ||
                          webhookData.action === 'payment.created';

    console.log('É evento de pagamento?', isPaymentEvent);
    console.log('Tipo do evento:', webhookData.type);
    console.log('Ação do evento:', webhookData.action);

    if (isPaymentEvent) {
      const paymentId = webhookData.data?.id || webhookData.id;
      
      if (!paymentId) {
        console.error('ID do pagamento não encontrado no webhook');
        return new Response(JSON.stringify({ 
          error: 'ID do pagamento não encontrado',
          received: true,
          processed: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log('=== PROCESSANDO PAGAMENTO ===');
      console.log('Payment ID:', paymentId);
      
      // Buscar detalhes do pagamento no Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Erro ao buscar pagamento no Mercado Pago:', paymentResponse.status, errorText);
        return new Response(JSON.stringify({ 
          error: `Erro ${paymentResponse.status} ao buscar pagamento no Mercado Pago`,
          received: true,
          processed: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      const paymentData = await paymentResponse.json();
      console.log('=== DADOS DO PAGAMENTO MP ===');
      console.log('Status:', paymentData.status);
      console.log('ID:', paymentData.id);
      console.log('External Reference:', paymentData.external_reference);

      // Buscar o pagamento no banco usando diferentes estratégias
      let paymentRecord = null;
      
      console.log('=== BUSCANDO PAGAMENTO NO BANCO ===');
      
      // Estratégia 1: Buscar pelo payment_id do Mercado Pago
      const { data: paymentByMpId, error: errorByMpId } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('mercado_pago_payment_id', paymentData.id.toString())
        .maybeSingle();

      if (errorByMpId) {
        console.error('Erro ao buscar por MP ID:', errorByMpId);
      } else if (paymentByMpId) {
        console.log('Pagamento encontrado por MP ID:', paymentByMpId.id);
        paymentRecord = paymentByMpId;
      }

      // Estratégia 2: Se não encontrou, buscar pela external_reference
      if (!paymentRecord && paymentData.external_reference) {
        console.log('Tentando buscar por external_reference:', paymentData.external_reference);
        
        const { data: paymentByRef, error: errorByRef } = await supabaseClient
          .from('payments')
          .select('*')
          .eq('mercado_pago_preference_id', paymentData.external_reference)
          .maybeSingle();

        if (errorByRef) {
          console.error('Erro ao buscar por external_reference:', errorByRef);
        } else if (paymentByRef) {
          console.log('Pagamento encontrado por external_reference:', paymentByRef.id);
          paymentRecord = paymentByRef;
        }
      }

      if (!paymentRecord) {
        console.error('=== PAGAMENTO NÃO ENCONTRADO ===');
        console.error('Buscado por payment_id:', paymentData.id);
        console.error('Buscado por external_reference:', paymentData.external_reference);
        
        // Listar todos os pagamentos para debug
        const { data: allPayments } = await supabaseClient
          .from('payments')
          .select('id, mercado_pago_payment_id, mercado_pago_preference_id, status')
          .limit(10);
        
        console.log('Últimos pagamentos no banco:', allPayments);
        
        return new Response(JSON.stringify({ 
          error: `Pagamento não encontrado - payment_id: ${paymentId}`,
          received: true,
          processed: false,
          debug: {
            searched_payment_id: paymentData.id,
            searched_external_reference: paymentData.external_reference,
            recent_payments: allPayments
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      console.log('=== PAGAMENTO ENCONTRADO ===');
      console.log('Record ID:', paymentRecord.id);
      console.log('User ID:', paymentRecord.user_id);
      console.log('Plan ID:', paymentRecord.plan_id);

      // Determinar o novo status
      let newStatus = 'pending';
      if (paymentData.status === 'approved') {
        newStatus = 'completed';
      } else if (paymentData.status === 'rejected') {
        newStatus = 'failed';
      } else if (paymentData.status === 'cancelled') {
        newStatus = 'cancelled';
      }

      console.log('=== ATUALIZANDO PAGAMENTO ===');
      console.log('Novo status:', newStatus);

      // Atualizar status do pagamento no banco
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

      // Se o pagamento foi aprovado, ativar assinatura
      if (paymentData.status === 'approved') {
        console.log('=== ATIVANDO ASSINATURA ===');
        console.log('User ID:', paymentRecord.user_id);
        console.log('Plan ID:', paymentRecord.plan_id);
        
        // Calcular datas do período
        const currentDate = new Date();
        const periodStart = new Date(currentDate);
        const periodEnd = new Date(currentDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Verificar se já existe uma assinatura para este usuário e plano
        const { data: existingSubscription, error: subError } = await supabaseClient
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', paymentRecord.user_id)
          .eq('plan_id', paymentRecord.plan_id)
          .maybeSingle();

        if (subError) {
          console.error('Erro ao buscar assinatura existente:', subError);
        }

        if (existingSubscription) {
          console.log('Atualizando assinatura existente:', existingSubscription.id);
          
          // Atualizar assinatura existente
          const { error: subscriptionError } = await supabaseClient
            .from('user_subscriptions')
            .update({
              status: 'active',
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubscription.id);

          if (subscriptionError) {
            console.error('Erro ao atualizar assinatura:', subscriptionError);
          } else {
            console.log('Assinatura atualizada com sucesso');
          }
        } else {
          console.log('Criando nova assinatura');
          
          // Criar nova assinatura
          const { error: subscriptionError } = await supabaseClient
            .from('user_subscriptions')
            .insert({
              user_id: paymentRecord.user_id,
              plan_id: paymentRecord.plan_id,
              status: 'active',
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (subscriptionError) {
            console.error('Erro ao criar assinatura:', subscriptionError);
          } else {
            console.log('Assinatura criada com sucesso');
          }
        }

        // Atualizar o status da assinatura no perfil do usuário
        console.log('=== ATUALIZANDO PERFIL ===');
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
          console.log('Perfil atualizado com sucesso');
        }
      }
    } else {
      console.log('=== EVENTO IGNORADO ===');
      console.log('Tipo:', webhookData.type);
      console.log('Ação:', webhookData.action);
    }

    console.log('=== WEBHOOK PROCESSADO COM SUCESSO ===');
    
    return new Response(JSON.stringify({ 
      received: true,
      processed: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO NO WEBHOOK ===');
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
