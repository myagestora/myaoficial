
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
      console.error('Token de autorização não fornecido');
      return new Response(JSON.stringify({ 
        error: 'Token de autorização necessário' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Validando token de usuário...');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.error('Erro de autenticação:', authError);
      return new Response(JSON.stringify({ 
        error: 'Token inválido: ' + authError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!user) {
      console.error('Usuário não encontrado');
      return new Response(JSON.stringify({ 
        error: 'Usuário não autenticado' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log('Usuário autenticado:', user.id);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'JSON inválido no corpo da requisição' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { planId, frequency, paymentMethod, cardData } = requestBody;
    
    if (!planId || !frequency || !paymentMethod) {
      console.error('Parâmetros obrigatórios faltando:', { planId, frequency, paymentMethod });
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: planId, frequency, paymentMethod' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Dados recebidos:', { planId, frequency, paymentMethod });

    // Buscar detalhes do plano
    console.log('Buscando plano no banco de dados...');
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) {
      console.error('Erro ao buscar plano:', planError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao buscar plano: ' + planError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (!planData) {
      console.error('Plano não encontrado:', planId);
      return new Response(JSON.stringify({ 
        error: 'Plano não encontrado' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log('Plano encontrado:', planData.name);

    // Buscar token do Mercado Pago
    console.log('Buscando token do Mercado Pago...');
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('value')
      .eq('key', 'mercado_pago_access_token')
      .single();

    if (configError) {
      console.error('Erro ao buscar token do MP:', configError);
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago não configurado: ' + configError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!configData || !configData.value) {
      console.error('Token do MP não encontrado na configuração');
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago não configurado' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const accessToken = typeof configData.value === 'string' ? 
      configData.value.replace(/^"|"$/g, '') : 
      String(configData.value).replace(/^"|"$/g, '');

    console.log('Token obtido:', accessToken ? 'OK' : 'VAZIO');

    // Determinar valor baseado na frequência
    const amount = frequency === 'monthly' ? planData.price_monthly : planData.price_yearly;
    if (!amount || amount <= 0) {
      console.error('Preço inválido para frequência:', frequency, 'valor:', amount);
      return new Response(JSON.stringify({ 
        error: `Preço não disponível para frequência ${frequency}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log('Valor do pagamento:', amount);

    // Criar ou buscar assinatura do usuário
    let subscriptionId;
    const { data: existingSubscription } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .maybeSingle();

    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
    } else {
      // Criar nova assinatura
      const { data: newSubscription, error: subscriptionError } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'inactive',
          frequency: frequency,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (frequency === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('Erro ao criar assinatura:', subscriptionError);
        return new Response(JSON.stringify({ 
          error: 'Erro ao criar assinatura: ' + subscriptionError.message
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      subscriptionId = newSubscription.id;
    }

    // Criar referência externa única
    const externalReference = `${user.id}_${planId}_${Date.now()}`;
    console.log('External reference:', externalReference);

    // Criar dados do pagamento para o Mercado Pago
    const paymentData: any = {
      transaction_amount: Number(amount),
      description: `${planData.name} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      external_reference: externalReference,
      payer: {
        email: user.email || 'user@example.com',
        first_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario',
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercado-pago-webhook`,
    };

    // Configurar método de pagamento
    if (paymentMethod === 'pix') {
      paymentData.payment_method_id = 'pix';
    } else if (paymentMethod === 'credit_card' && cardData) {
      // Para cartão de crédito, seria necessário tokenizar no frontend
      paymentData.payment_method_id = 'visa'; // Exemplo
      paymentData.installments = 1;
      if (cardData.cpf) {
        paymentData.payer.identification = {
          type: 'CPF',
          number: cardData.cpf.replace(/\D/g, '')
        };
      }
    }

    console.log('Criando pagamento no Mercado Pago...');
    console.log('Dados do pagamento:', JSON.stringify({
      ...paymentData,
      // Não logar dados sensíveis
      payer: { ...paymentData.payer, identification: paymentData.payer.identification ? 'HIDDEN' : undefined }
    }, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference // Para evitar pagamentos duplicados
      },
      body: JSON.stringify(paymentData),
    });

    console.log('Status da resposta do MP:', mpResponse.status);

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Erro do Mercado Pago - Status:', mpResponse.status);
      console.error('Erro do Mercado Pago - Body:', errorText);
      
      let errorMessage = `Erro do Mercado Pago (${mpResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        } else if (errorJson.cause && errorJson.cause.length > 0) {
          errorMessage += `: ${errorJson.cause[0].description}`;
        }
      } catch {
        errorMessage += `: ${errorText.substring(0, 200)}`;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const mpPayment = await mpResponse.json();
    console.log('Pagamento criado no MP:', {
      id: mpPayment.id,
      status: mpPayment.status,
      payment_method_id: mpPayment.payment_method_id
    });

    // Salvar o pagamento no banco de dados
    console.log('Salvando pagamento no banco de dados...');
    
    const { data: paymentRecord, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: planId,
        subscription_id: subscriptionId, // Vincular com a assinatura
        amount: Number(amount),
        currency: 'BRL',
        payment_method: paymentMethod,
        mercado_pago_payment_id: mpPayment.id.toString(),
        mercado_pago_preference_id: externalReference,
        status: mpPayment.status === 'approved' ? 'completed' : 'pending',
        payment_date: mpPayment.date_approved || mpPayment.date_created,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao salvar pagamento no banco:', paymentError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao salvar pagamento: ' + paymentError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('Pagamento salvo no banco:', paymentRecord.id);

    // Se foi aprovado imediatamente, ativar assinatura
    if (mpPayment.status === 'approved') {
      console.log('Pagamento aprovado imediatamente - ativando assinatura...');
      
      await supabaseClient
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

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
    const response: any = {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      payment_method_id: mpPayment.payment_method?.id,
      date_created: mpPayment.date_created,
      date_approved: mpPayment.date_approved,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
      payment_record_id: paymentRecord.id,
      subscription_id: subscriptionId
    };

    // Se for PIX, incluir dados do QR Code
    if (paymentMethod === 'pix' && mpPayment.point_of_interaction?.transaction_data) {
      response.pix_data = {
        qr_code: mpPayment.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpPayment.point_of_interaction.transaction_data.qr_code_base64,
      };
      console.log('QR Code PIX gerado com sucesso');
    }

    console.log('=== PAGAMENTO CRIADO COM SUCESSO ===');
    console.log('Payment ID:', mpPayment.id);
    console.log('Status:', mpPayment.status);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('=== ERRO GERAL NA CRIAÇÃO DO PAGAMENTO ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido')
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
