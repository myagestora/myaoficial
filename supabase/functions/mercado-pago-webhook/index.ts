
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
      console.log('Webhook data completo:', JSON.stringify(webhookData, null, 2));
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

    // Verificar se é evento de pagamento (criação ou atualização)
    const isPaymentEvent = webhookData.type === 'payment' || 
                          (webhookData.action && (
                            webhookData.action === 'payment.created' || 
                            webhookData.action === 'payment.updated'
                          ));

    if (!isPaymentEvent) {
      console.log('Não é evento de pagamento relevante:', webhookData.type || webhookData.action);
      return new Response(JSON.stringify({ 
        received: true,
        message: 'Evento ignorado - não é de pagamento relevante'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Processando evento de pagamento:', webhookData.action || webhookData.type);

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

    // Aguardar um pouco se for evento de criação para dar tempo do pagamento ser processado
    if (webhookData.action === 'payment.created') {
      console.log('Evento de criação - aguardando 5 segundos...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

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
    console.log('Payment data do MP:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference,
      date_approved: paymentData.date_approved,
      date_created: paymentData.date_created
    });

    // Buscar pagamento no banco - tentar por payment_id primeiro, depois por preference_id
    let paymentRecord;
    
    // Primeiro: buscar por mercado_pago_payment_id
    const { data: recordById, error: findByIdError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('mercado_pago_payment_id', paymentData.id.toString())
      .maybeSingle();

    if (findByIdError) {
      console.error('Erro ao buscar por payment_id:', findByIdError);
    } else if (recordById) {
      paymentRecord = recordById;
      console.log('Pagamento encontrado por payment_id:', paymentRecord.id);
    }

    // Segundo: se não encontrou, buscar por preference_id
    if (!paymentRecord && paymentData.external_reference) {
      const { data: recordByRef, error: findByRefError } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('mercado_pago_preference_id', paymentData.external_reference)
        .maybeSingle();

      if (findByRefError) {
        console.error('Erro ao buscar por preference_id:', findByRefError);
      } else if (recordByRef) {
        paymentRecord = recordByRef;
        console.log('Pagamento encontrado por preference_id:', paymentRecord.id);
      }
    }

    if (!paymentRecord) {
      console.log('Pagamento não encontrado no banco - IDs buscados:', {
        payment_id: paymentData.id,
        external_reference: paymentData.external_reference
      });
      return new Response(JSON.stringify({ 
        received: true,
        error: 'Pagamento não encontrado no banco'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Pagamento encontrado no banco:', paymentRecord.id);

    // Determinar status
    let newStatus = 'pending';
    if (paymentData.status === 'approved') {
      newStatus = 'completed';
    } else if (paymentData.status === 'rejected') {
      newStatus = 'failed';
    } else if (paymentData.status === 'cancelled') {
      newStatus = 'cancelled';
    }

    console.log('Status atual no MP:', paymentData.status);
    console.log('Novo status a ser definido:', newStatus);
    console.log('Status atual no banco:', paymentRecord.status);

    // Só atualizar se o status mudou
    if (paymentRecord.status !== newStatus) {
      console.log('Atualizando status do pagamento...');
      
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

      console.log('Pagamento atualizado com sucesso');

      // Se foi aprovado, ativar assinatura
      if (newStatus === 'completed') {
        console.log('Pagamento aprovado - ativando assinatura...');
        
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
            
            console.log('Assinatura existente atualizada');
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
            
            console.log('Nova assinatura criada');
          }

          // Atualizar perfil
          await supabaseClient
            .from('profiles')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.user_id);

          console.log('Perfil atualizado - assinatura ativada');
        } catch (subscriptionError) {
          console.error('Erro na ativação da assinatura:', subscriptionError);
          // Não falhar o webhook por erro na assinatura
        }
      }
    } else {
      console.log('Status não mudou - não é necessário atualizar');
    }

    console.log('=== WEBHOOK PROCESSADO COM SUCESSO ===');
    
    return new Response(JSON.stringify({ 
      received: true,
      processed: true,
      status: newStatus,
      payment_id: paymentData.id,
      action: webhookData.action
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO GERAL NO WEBHOOK ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      received: true,
      error: 'Erro interno',
      message: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
