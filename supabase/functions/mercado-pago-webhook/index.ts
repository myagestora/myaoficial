
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  console.log('=== WEBHOOK INICIADO ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Ler body como texto primeiro
    const bodyText = await req.text();
    console.log('Body bruto:', bodyText);
    
    if (!bodyText) {
      console.log('Body vazio - retornando 200');
      return new Response(JSON.stringify({ 
        received: true,
        message: 'Body vazio'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Tentar fazer parse do JSON
    let webhookData;
    try {
      webhookData = JSON.parse(bodyText);
      console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('Erro no parse JSON:', parseError);
      return new Response(JSON.stringify({ 
        received: true,
        error: 'JSON inválido'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verificar se é evento de pagamento
    const isPaymentEvent = webhookData.type === 'payment' || 
                          (webhookData.action && webhookData.action.includes('payment'));

    if (!isPaymentEvent) {
      console.log('Não é evento de pagamento:', webhookData.type || webhookData.action);
      return new Response(JSON.stringify({ 
        received: true,
        message: 'Evento ignorado - não é de pagamento'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Processando evento de pagamento...');

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('Cliente Supabase criado');

    // Buscar token do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError) {
      console.error('Erro ao buscar token:', configError);
      return new Response(JSON.stringify({ 
        received: true,
        error: 'Token não encontrado'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const accessToken = typeof configData.value === 'string' ? 
      configData.value.replace(/^"|"$/g, '') : 
      String(configData.value).replace(/^"|"$/g, '');

    console.log('Token obtido');

    // Obter ID do pagamento
    const paymentId = webhookData.data?.id || webhookData.id;
    
    if (!paymentId) {
      console.log('ID do pagamento não encontrado');
      return new Response(JSON.stringify({ 
        received: true,
        error: 'Payment ID não encontrado'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Payment ID:', paymentId);

    // Buscar pagamento no Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('Erro MP API:', paymentResponse.status);
      return new Response(JSON.stringify({ 
        received: true,
        error: `Erro ${paymentResponse.status} na API do MP`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment data:', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference
    });

    // Buscar pagamento no banco
    const { data: paymentRecord, error: findError } = await supabaseClient
      .from('payments')
      .select('*')
      .or(`mercado_pago_payment_id.eq.${paymentData.id},mercado_pago_preference_id.eq.${paymentData.external_reference || 'null'}`)
      .maybeSingle();

    if (findError) {
      console.error('Erro ao buscar pagamento:', findError);
      return new Response(JSON.stringify({ 
        received: true,
        error: 'Erro ao buscar pagamento no banco'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!paymentRecord) {
      console.log('Pagamento não encontrado no banco');
      return new Response(JSON.stringify({ 
        received: true,
        error: 'Pagamento não encontrado no banco'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Pagamento encontrado:', paymentRecord.id);

    // Determinar status
    let newStatus = 'pending';
    if (paymentData.status === 'approved') {
      newStatus = 'completed';
    } else if (paymentData.status === 'rejected') {
      newStatus = 'failed';
    } else if (paymentData.status === 'cancelled') {
      newStatus = 'cancelled';
    }

    console.log('Novo status:', newStatus);

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
        received: true,
        error: 'Erro ao atualizar pagamento'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Pagamento atualizado');

    // Se aprovado, ativar assinatura
    if (paymentData.status === 'approved') {
      console.log('Ativando assinatura...');
      
      try {
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
          await supabaseClient
            .from('user_subscriptions')
            .update({
              status: 'active',
              current_period_start: currentDate.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubscription.id);
        } else {
          // Criar nova assinatura
          await supabaseClient
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
        }

        // Atualizar perfil
        await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.user_id);

        console.log('Assinatura ativada');
      } catch (subscriptionError) {
        console.error('Erro na assinatura:', subscriptionError);
        // Não falhar o webhook por erro na assinatura
      }
    }

    console.log('=== WEBHOOK PROCESSADO ===');
    
    return new Response(JSON.stringify({ 
      received: true,
      processed: true,
      status: newStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO GERAL ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      received: true,
      error: 'Erro interno'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
