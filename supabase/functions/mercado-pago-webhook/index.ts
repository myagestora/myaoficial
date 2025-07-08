
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
    console.log('Webhook recebido do Mercado Pago');

    // Obter dados do webhook
    const body = await req.text();
    const webhookData = JSON.parse(body);
    
    console.log('Dados do webhook:', webhookData);

    // Buscar configurações do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError) {
      console.error('Erro ao buscar configurações:', configError);
      throw new Error('Configurações do Mercado Pago não encontradas');
    }

    const accessToken = typeof configData.value === 'string' ? 
      configData.value.replace(/^"|"$/g, '') : 
      JSON.stringify(configData.value).replace(/^"|"$/g, '');

    console.log('Token obtido com sucesso');

    // Verificar se é um evento de pagamento
    const isPaymentEvent = webhookData.type === 'payment' || 
                          webhookData.action === 'payment.updated' ||
                          webhookData.action === 'payment.created';

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

      console.log('Processando pagamento ID:', paymentId);
      
      // Buscar detalhes do pagamento no Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Erro ao buscar pagamento no Mercado Pago:', paymentResponse.status, errorText);
        throw new Error(`Erro ${paymentResponse.status} ao buscar pagamento no Mercado Pago`);
      }

      const paymentData = await paymentResponse.json();
      console.log('Dados do pagamento do MP:', paymentData);

      // Buscar o pagamento no banco usando o ID do Mercado Pago
      let paymentRecord = null;
      
      // Primeiro, tentar buscar pelo payment_id
      const { data: paymentByMpId } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('mercado_pago_payment_id', paymentData.id.toString())
        .maybeSingle();

      if (paymentByMpId) {
        paymentRecord = paymentByMpId;
      } else if (paymentData.external_reference) {
        // Se não encontrou pelo payment_id, tentar buscar pela external_reference
        console.log('Buscando por external_reference:', paymentData.external_reference);
        
        const { data: paymentByRef } = await supabaseClient
          .from('payments')
          .select('*')
          .eq('mercado_pago_preference_id', paymentData.external_reference)
          .maybeSingle();

        paymentRecord = paymentByRef;
      }

      if (!paymentRecord) {
        console.error('Pagamento não encontrado no banco de dados para payment_id:', paymentId);
        return new Response(JSON.stringify({ 
          error: `Pagamento não encontrado - payment_id: ${paymentId}`,
          received: true,
          processed: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      console.log('Registro de pagamento encontrado:', paymentRecord);

      // Determinar o novo status
      let newStatus = 'pending';
      if (paymentData.status === 'approved') {
        newStatus = 'completed';
      } else if (paymentData.status === 'rejected') {
        newStatus = 'failed';
      } else if (paymentData.status === 'cancelled') {
        newStatus = 'cancelled';
      }

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
        throw updateError;
      }

      console.log('Pagamento atualizado com sucesso para status:', newStatus);

      // Se o pagamento foi aprovado, ativar assinatura
      if (paymentData.status === 'approved') {
        console.log('Pagamento aprovado, ativando assinatura para usuário:', paymentRecord.user_id);
        
        // Calcular datas do período
        const currentDate = new Date();
        const periodStart = new Date(currentDate);
        const periodEnd = new Date(currentDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Verificar se já existe uma assinatura para este usuário e plano
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
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSubscription.id);

          if (subscriptionError) {
            console.error('Erro ao atualizar assinatura:', subscriptionError);
            throw subscriptionError;
          }
          
          console.log('Assinatura atualizada com sucesso');
        } else {
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
            throw subscriptionError;
          }
          
          console.log('Assinatura criada com sucesso');
        }

        // Atualizar o status da assinatura no perfil do usuário
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.user_id);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          // Não falhar o webhook por erro no perfil
        } else {
          console.log('Perfil atualizado com sucesso para usuário:', paymentRecord.user_id);
        }
      }
    } else {
      console.log('Evento não é de pagamento, ignorando:', webhookData.type || webhookData.action);
    }

    return new Response(JSON.stringify({ 
      received: true,
      processed: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      received: true,
      processed: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
