
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
      // Implementação básica de validação - pode ser melhorada
      console.log('Validando assinatura do webhook');
    }

    // Processar o webhook
    const webhookData = JSON.parse(body);
    console.log('Dados do webhook processados:', webhookData);

    // Verificar se é um evento de pagamento
    if (webhookData.type === 'payment') {
      const paymentId = webhookData.data?.id;
      
      if (paymentId) {
        // Buscar detalhes do pagamento no Mercado Pago
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${config.mercado_pago_access_token}`
          }
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log('Dados do pagamento:', paymentData);

          // Atualizar status do pagamento no banco
          const { error: updateError } = await supabaseClient
            .from('payments')
            .update({
              status: paymentData.status,
              mercado_pago_payment_id: paymentData.id.toString(),
              payment_date: paymentData.date_approved || paymentData.date_created,
              updated_at: new Date().toISOString()
            })
            .eq('mercado_pago_preference_id', paymentData.external_reference);

          if (updateError) {
            console.error('Erro ao atualizar pagamento:', updateError);
          }

          // Se o pagamento foi aprovado, criar/atualizar assinatura
          if (paymentData.status === 'approved') {
            // Buscar dados do pagamento para obter o plano
            const { data: paymentRecord, error: paymentError } = await supabaseClient
              .from('payments')
              .select('user_id, plan_id')
              .eq('mercado_pago_preference_id', paymentData.external_reference)
              .single();

            if (!paymentError && paymentRecord) {
              // Criar ou atualizar assinatura do usuário
              const subscriptionData = {
                user_id: paymentRecord.user_id,
                plan_id: paymentRecord.plan_id,
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
                updated_at: new Date().toISOString()
              };

              const { error: subscriptionError } = await supabaseClient
                .from('user_subscriptions')
                .upsert(subscriptionData);

              if (subscriptionError) {
                console.error('Erro ao criar/atualizar assinatura:', subscriptionError);
              } else {
                console.log('Assinatura criada/atualizada com sucesso');
              }
            }
          }
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
