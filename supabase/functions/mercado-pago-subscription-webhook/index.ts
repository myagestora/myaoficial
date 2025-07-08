
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

    console.log('Webhook de assinatura recebido do Mercado Pago');

    const body = await req.text();
    const webhookData = JSON.parse(body);

    console.log('Dados do webhook:', webhookData);

    // Buscar token do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .eq('key', 'mercado_pago_access_token');

    if (configError) {
      console.error('Erro ao buscar configurações:', configError);
      throw configError;
    }

    const accessToken = configData[0]?.value;
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    const cleanToken = typeof accessToken === 'string' ? 
      accessToken.replace(/^"|"$/g, '') : 
      JSON.stringify(accessToken).replace(/^"|"$/g, '');

    // Verificar se é um evento de assinatura
    if (webhookData.type === 'subscription_preapproval') {
      const subscriptionId = webhookData.data?.id;
      
      if (subscriptionId) {
        // Buscar detalhes da assinatura no Mercado Pago
        const subscriptionResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${cleanToken}`
          }
        });

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          console.log('Dados da assinatura:', subscriptionData);

          // Extrair user_id e plan_id da external_reference
          const externalReference = subscriptionData.external_reference;
          if (externalReference) {
            const [userId, planId] = externalReference.split('_');

            // Atualizar status da assinatura no banco
            let newStatus = 'inactive';
            if (subscriptionData.status === 'authorized') {
              newStatus = 'active';
            } else if (subscriptionData.status === 'cancelled') {
              newStatus = 'canceled';
            } else if (subscriptionData.status === 'paused') {
              newStatus = 'inactive';
            }

            const { error: updateError } = await supabaseClient
              .from('user_subscriptions')
              .update({
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('plan_id', planId);

            if (updateError) {
              console.error('Erro ao atualizar assinatura:', updateError);
            } else {
              console.log(`Assinatura atualizada para status: ${newStatus}`);
            }
          }
        }
      }
    }

    // Verificar se é um evento de pagamento de assinatura
    if (webhookData.type === 'subscription_authorized_payment') {
      const paymentId = webhookData.data?.id;
      
      if (paymentId) {
        // Buscar detalhes do pagamento no Mercado Pago
        const paymentResponse = await fetch(`https://api.mercadopago.com/authorized_payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${cleanToken}`
          }
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log('Dados do pagamento de assinatura:', paymentData);

          // Registrar pagamento no banco
          const { error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
              user_id: paymentData.external_reference?.split('_')[0],
              plan_id: paymentData.external_reference?.split('_')[1],
              amount: paymentData.transaction_amount,
              currency: paymentData.currency_id,
              payment_method: 'mercado_pago',
              mercado_pago_payment_id: paymentData.id.toString(),
              payment_date: paymentData.date_created,
              status: paymentData.status === 'approved' ? 'completed' : 'failed'
            });

          if (paymentError) {
            console.error('Erro ao registrar pagamento:', paymentError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no webhook de assinatura:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
