
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

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('Webhook recebido do Mercado Pago');

    // Obter dados do webhook
    const body = await req.text();
    const signature = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id");

    console.log('Dados do webhook:', { body, signature, requestId });

    // Buscar configurações do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .in('key', ['mercado_pago_webhook_secret', 'mercado_pago_access_token']);

    if (configError) {
      console.error('Erro ao buscar configurações:', configError);
      throw configError;
    }

    const config: Record<string, string> = {};
    configData.forEach(item => {
      config[item.key] = typeof item.value === 'string' ? 
        item.value.replace(/^"|"$/g, '') : 
        JSON.stringify(item.value).replace(/^"|"$/g, '');
    });

    // Processar o webhook
    const webhookData = JSON.parse(body);
    console.log('Dados do webhook processados:', webhookData);

    // Verificar se é um evento de pagamento
    if (webhookData.type === 'payment' || webhookData.action === 'payment.updated') {
      const paymentId = webhookData.data?.id || webhookData.id;
      
      if (paymentId) {
        console.log('Processando pagamento ID:', paymentId);
        
        // Buscar detalhes do pagamento no Mercado Pago
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${config.mercado_pago_access_token}`
          }
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log('Dados do pagamento do MP:', paymentData);

          // Buscar o pagamento no banco usando o ID do Mercado Pago
          const { data: paymentRecord } = await supabaseClient
            .from('payments')
            .select('*')
            .eq('mercado_pago_payment_id', paymentData.id.toString())
            .maybeSingle();

          let finalPaymentRecord = paymentRecord;

          // Se não encontrou pelo payment_id, tentar buscar pela external_reference ou preference_id
          if (!finalPaymentRecord && paymentData.external_reference) {
            console.log('Buscando por external_reference:', paymentData.external_reference);
            
            const { data: altPaymentRecord } = await supabaseClient
              .from('payments')
              .select('*')
              .eq('mercado_pago_preference_id', paymentData.external_reference)
              .maybeSingle();

            finalPaymentRecord = altPaymentRecord;
          }

          if (!finalPaymentRecord) {
            console.error('Pagamento não encontrado no banco de dados para payment_id:', paymentId);
            return new Response(JSON.stringify({ 
              error: 'Pagamento não encontrado',
              payment_id: paymentId 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            });
          }

          console.log('Registro de pagamento encontrado:', finalPaymentRecord);

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
            .eq('id', finalPaymentRecord.id);

          if (updateError) {
            console.error('Erro ao atualizar pagamento:', updateError);
            throw updateError;
          } else {
            console.log('Pagamento atualizado com sucesso para status:', newStatus);
          }

          // Se o pagamento foi aprovado, criar/atualizar assinatura
          if (paymentData.status === 'approved') {
            console.log('Pagamento aprovado, ativando assinatura para usuário:', finalPaymentRecord.user_id);
            
            // Calcular datas do período
            const currentDate = new Date();
            const periodStart = new Date(currentDate);
            const periodEnd = new Date(currentDate);
            
            // Assumir que é mensal por padrão (pode ser ajustado conforme necessário)
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            // Verificar se já existe uma assinatura para este usuário e plano
            const { data: existingSubscription } = await supabaseClient
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', finalPaymentRecord.user_id)
              .eq('plan_id', finalPaymentRecord.plan_id)
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
              } else {
                console.log('Assinatura atualizada com sucesso');
              }
            } else {
              // Criar nova assinatura
              const { error: subscriptionError } = await supabaseClient
                .from('user_subscriptions')
                .insert({
                  user_id: finalPaymentRecord.user_id,
                  plan_id: finalPaymentRecord.plan_id,
                  status: 'active',
                  current_period_start: periodStart.toISOString(),
                  current_period_end: periodEnd.toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (subscriptionError) {
                console.error('Erro ao criar assinatura:', subscriptionError);
                throw subscriptionError;
              } else {
                console.log('Assinatura criada com sucesso');
              }
            }

            // Atualizar o status da assinatura no perfil do usuário
            const { error: profileError } = await supabaseClient
              .from('profiles')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', finalPaymentRecord.user_id);

            if (profileError) {
              console.error('Erro ao atualizar perfil:', profileError);
              // Não falhar o webhook por erro no perfil
            } else {
              console.log('Perfil atualizado com sucesso para usuário:', finalPaymentRecord.user_id);
            }
          }
        } else {
          console.error('Erro ao buscar pagamento no Mercado Pago:', paymentResponse.status, await paymentResponse.text());
          throw new Error(`Erro ${paymentResponse.status} ao buscar pagamento no Mercado Pago`);
        }
      } else {
        console.error('ID do pagamento não encontrado no webhook');
        throw new Error('ID do pagamento não encontrado');
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
