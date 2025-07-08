
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log('=== CREATE MERCADO PAGO PAYMENT INICIADO ===');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Usuário autenticado:', user.id);

    const { planId, frequency, paymentMethod, cardData } = await req.json();
    console.log('Dados recebidos:', { planId, frequency, paymentMethod });

    // Buscar detalhes do plano
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      throw new Error('Plano não encontrado');
    }

    console.log('Plano encontrado:', planData.name);

    // Buscar token do Mercado Pago
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError || !configData) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    const accessToken = typeof configData.value === 'string' ? 
      configData.value.replace(/^"|"$/g, '') : 
      String(configData.value).replace(/^"|"$/g, '');

    console.log('Token obtido');

    // Determinar valor baseado na frequência
    const amount = frequency === 'monthly' ? planData.price_monthly : planData.price_yearly;
    if (!amount) {
      throw new Error(`Preço não disponível para frequência ${frequency}`);
    }

    console.log('Valor do pagamento:', amount);

    // Criar pagamento no Mercado Pago
    const paymentData: any = {
      transaction_amount: amount,
      description: `${planData.name} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      payment_method_id: paymentMethod === 'pix' ? 'pix' : undefined,
      external_reference: `${user.id}_${planId}_${Date.now()}`,
      payer: {
        email: user.email,
        first_name: user.user_metadata?.full_name || 'Usuario',
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
    };

    // Se for cartão de crédito, adicionar dados do cartão
    if (paymentMethod === 'credit_card' && cardData) {
      paymentData.payment_method_id = 'visa'; // ou detectar automaticamente
      paymentData.token = 'card_token'; // Em produção, deve ser tokenizado no frontend
      paymentData.installments = 1;
      paymentData.payer = {
        ...paymentData.payer,
        identification: {
          type: 'CPF',
          number: cardData.cpf.replace(/\D/g, '')
        }
      };
    }

    console.log('Criando pagamento no Mercado Pago...');

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Erro do Mercado Pago:', errorText);
      throw new Error(`Erro do Mercado Pago: ${mpResponse.status}`);
    }

    const mpPayment = await mpResponse.json();
    console.log('Pagamento criado no MP:', {
      id: mpPayment.id,
      status: mpPayment.status,
      payment_method_id: mpPayment.payment_method_id
    });

    // CRUCIAL: Salvar o pagamento no banco de dados COM o ID do Mercado Pago
    console.log('Salvando pagamento no banco de dados...');
    
    const { data: paymentRecord, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        currency: 'BRL',
        payment_method: paymentMethod,
        mercado_pago_payment_id: mpPayment.id.toString(), // SALVAR O ID AQUI!
        mercado_pago_preference_id: paymentData.external_reference,
        status: mpPayment.status === 'approved' ? 'completed' : 'pending',
        payment_date: mpPayment.date_approved || mpPayment.date_created,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao salvar pagamento:', paymentError);
      throw new Error('Erro ao salvar pagamento no banco');
    }

    console.log('Pagamento salvo no banco:', paymentRecord.id);

    // Se foi aprovado imediatamente, ativar assinatura
    if (mpPayment.status === 'approved') {
      console.log('Pagamento aprovado imediatamente - ativando assinatura...');
      
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      periodEnd.setMonth(periodEnd.getMonth() + (frequency === 'yearly' ? 12 : 1));

      // Verificar se já existe assinatura
      const { data: existingSubscription } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', planId)
        .maybeSingle();

      if (existingSubscription) {
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
        await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_id: planId,
            status: 'active',
            current_period_start: currentDate.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
      }

      // Atualizar perfil
      await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      console.log('Assinatura ativada');
    }

    // Preparar resposta
    const response = {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      payment_method_id: mpPayment.payment_method?.id,
      date_created: mpPayment.date_created,
      date_approved: mpPayment.date_approved,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
      payment_record_id: paymentRecord.id
    };

    // Se for PIX, incluir dados do QR Code
    if (paymentMethod === 'pix' && mpPayment.point_of_interaction?.transaction_data) {
      response.pix_data = {
        qr_code: mpPayment.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpPayment.point_of_interaction.transaction_data.qr_code_base64,
      };
    }

    console.log('=== PAGAMENTO CRIADO COM SUCESSO ===');
    console.log('Payment ID:', mpPayment.id);
    console.log('Status:', mpPayment.status);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO NA CRIAÇÃO DO PAGAMENTO ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
