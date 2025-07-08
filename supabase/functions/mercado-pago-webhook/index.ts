
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

    // Validar assinatura (se configurada)
    if (config.mercado_pago_webhook_secret && signature) {
      const expectedSignature = `ts=${Date.now()},v1=${config.mercado_pago_webhook_secret}`;
      console.log('Validando assinatura do webhook');
    }

    // Processar o webhook
    const webhookData = JSON.parse(body);
    console.log('Dados do webhook processados:', webhookData);

    // Verificar se é um evento de pagamento
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data?.id;
      
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
          console.log('Dados do pagamento:', paymentData);

          // Buscar o pagamento no banco usando o ID do Mercado Pago
          const { data: paymentRecord, error: paymentError } = await supabaseClient
            .from('payments')
            .select('*')
            .eq('mercado_pago_payment_id', paymentData.id.toString())
            .single();

          if (paymentError) {
            console.error('Erro ao buscar pagamento no banco:', paymentError);
            
            // Se não encontrar pelo payment_id, tentar buscar pela external_reference
            if (paymentData.external_reference) {
              const { data: altPaymentRecord, error: altPaymentError } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('mercado_pago_preference_id', paymentData.external_reference)
                .single();

              if (altPaymentError) {
                console.error('Erro ao buscar pagamento pela external_reference:', altPaymentError);
                throw new Error('Pagamento não encontrado no banco de dados');
              }
              
              // Usar o registro alternativo
              paymentRecord = altPaymentRecord;
            } else {
              throw paymentError;
            }
          }

          console.log('Registro de pagamento encontrado:', paymentRecord);

          // Atualizar status do pagamento no banco
          const { error: updateError } = await supabaseClient
            .from('payments')
            .update({
              status: paymentData.status === 'approved' ? 'completed' : paymentData.status,
              mercado_pago_payment_id: paymentData.id.toString(),
              payment_date: paymentData.date_approved || paymentData.date_created,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.id);

          if (updateError) {
            console.error('Erro ao atualizar pagamento:', updateError);
          } else {
            console.log('Pagamento atualizado com sucesso');
          }

          // Se o pagamento foi aprovado, criar/atualizar assinatura
          if (paymentData.status === 'approved') {
            console.log('Pagamento aprovado, criando/atualizando assinatura');
            
            // Calcular datas do período
            const currentDate = new Date();
            const periodStart = new Date(currentDate);
            const periodEnd = new Date(currentDate);
            
            // Assumir que é mensal por padrão (pode ser ajustado conforme necessário)
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            // Criar ou atualizar assinatura do usuário
            const subscriptionData = {
              user_id: paymentRecord.user_id,
              plan_id: paymentRecord.plan_id,
              status: 'active',
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString()
            };

            console.log('Dados da assinatura a ser criada/atualizada:', subscriptionData);

            // Verificar se já existe uma assinatura para este usuário e plano
            const { data: existingSubscription, error: existingError } = await supabaseClient
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', paymentRecord.user_id)
              .eq('plan_id', paymentRecord.plan_id)
              .single();

            if (existingError && existingError.code !== 'PGRST116') {
              console.error('Erro ao verificar assinatura existente:', existingError);
            }

            if (existingSubscription) {
              // Atualizar assinatura existente
              const { error: subscriptionError } = await supabaseClient
                .from('user_subscriptions')
                .update(subscriptionData)
                .eq('id', existingSubscription.id);

              if (subscriptionError) {
                console.error('Erro ao atualizar assinatura:', subscriptionError);
              } else {
                console.log('Assinatura atualizada com sucesso');
              }
            } else {
              // Criar nova assinatura
              const { error: subscriptionError } = await supabaseClient
                .from('user_subscriptions')
                .insert(subscriptionData);

              if (subscriptionError) {
                console.error('Erro ao criar assinatura:', subscriptionError);
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
              .eq('id', paymentRecord.user_id);

            if (profileError) {
              console.error('Erro ao atualizar perfil:', profileError);
            } else {
              console.log('Perfil atualizado com sucesso');
            }
          }
        } else {
          console.error('Erro ao buscar pagamento no Mercado Pago:', paymentResponse.status);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
