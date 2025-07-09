
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PaymentRequest } from './types.ts';
import { validateCardData } from './validation.ts';
import { buildPaymentData } from './payment-builder.ts';
import { 
  createSupabaseClient, 
  getPlanData, 
  getMercadoPagoToken, 
  createOrGetSubscription,
  savePaymentRecord,
  activateSubscription
} from './database-service.ts';
import { createMercadoPagoPayment } from './mercado-pago-service.ts';
import { authenticateUser } from './auth-service.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log('=== CREATE MERCADO PAGO PAYMENT INICIADO ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient();

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header presente:', !!authHeader);
    
    const user = await authenticateUser(supabaseClient, authHeader);
    console.log('Usuário autenticado:', user.id);

    // Parse do corpo da requisição
    let requestBody: PaymentRequest;
    try {
      const bodyText = await req.text();
      console.log('Request body raw:', bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'JSON inválido no corpo da requisição',
        details: parseError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { planId, frequency, paymentMethod, cardData } = requestBody;
    
    console.log('Dados da requisição:', {
      planId,
      frequency,
      paymentMethod,
      hasCardData: !!cardData,
      cardDataKeys: cardData ? Object.keys(cardData) : []
    });
    
    if (!planId || !frequency || !paymentMethod) {
      console.error('Parâmetros obrigatórios faltando:', { planId, frequency, paymentMethod });
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: planId, frequency, paymentMethod' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validar dados do cartão se necessário
    if (paymentMethod === 'credit_card') {
      if (!cardData) {
        console.error('Dados do cartão não fornecidos para pagamento com cartão');
        return new Response(JSON.stringify({ 
          error: 'Dados do cartão são obrigatórios para pagamento com cartão' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log('Validando dados do cartão...');
      const validation = validateCardData(cardData);
      if (!validation.isValid) {
        console.error('Dados do cartão inválidos:', validation.error);
        return new Response(JSON.stringify({ 
          error: validation.error 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      console.log('Dados do cartão validados com sucesso');
    }

    // Buscar dados do plano
    console.log('Buscando dados do plano:', planId);
    const planData = await getPlanData(supabaseClient, planId);
    console.log('Plano encontrado:', planData.name);

    // Buscar token do Mercado Pago
    console.log('Buscando token do Mercado Pago...');
    const accessToken = await getMercadoPagoToken(supabaseClient);
    console.log('Token do MP obtido:', accessToken ? 'Sim' : 'Não');

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

    console.log('Valor do pagamento determinado:', amount);

    // Criar ou buscar assinatura do usuário
    console.log('Criando/buscando assinatura do usuário...');
    const subscriptionId = await createOrGetSubscription(supabaseClient, user.id, planId, frequency);
    console.log('Subscription ID:', subscriptionId);

    // Criar referência externa única
    const externalReference = `${user.id}_${planId}_${Date.now()}`;
    console.log('External reference gerada:', externalReference);

    // Criar dados do pagamento para o Mercado Pago
    console.log('Construindo dados do pagamento...');
    const paymentData = buildPaymentData(
      amount,
      planData.name,
      frequency,
      externalReference,
      user.email,
      user.user_metadata?.full_name || user.user_metadata?.name,
      paymentMethod,
      cardData
    );

    console.log('Enviando pagamento para o Mercado Pago...');

    try {
      // Criar pagamento no Mercado Pago
      const mpPayment = await createMercadoPagoPayment(paymentData, accessToken, externalReference);

      console.log('=== PAGAMENTO MERCADO PAGO CRIADO ===');
      console.log('Payment ID:', mpPayment.id);
      console.log('Status:', mpPayment.status);
      console.log('Status detail:', mpPayment.status_detail);

      // Salvar o pagamento no banco de dados
      console.log('Salvando pagamento no banco de dados...');
      const paymentRecord = await savePaymentRecord(
        supabaseClient,
        user.id,
        planId,
        subscriptionId,
        amount,
        paymentMethod,
        mpPayment,
        externalReference
      );
      console.log('Payment record salvo:', paymentRecord.id);

      // Se foi aprovado imediatamente, ativar assinatura
      if (mpPayment.status === 'approved') {
        console.log('Pagamento aprovado imediatamente, ativando assinatura...');
        await activateSubscription(supabaseClient, subscriptionId, user.id);
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
        console.log('QR Code PIX incluído na resposta');
      }

      console.log('=== RESPOSTA FINAL PREPARADA ===');
      console.log('Response keys:', Object.keys(response));

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (mpError) {
      console.error('=== ERRO ESPECÍFICO DO MERCADO PAGO ===');
      console.error('MP Error type:', typeof mpError);
      console.error('MP Error:', mpError);
      console.error('MP Error message:', mpError.message);
      console.error('MP Error details:', (mpError as any).details);
      console.error('MP Error status:', (mpError as any).status);
      console.error('MP Error statusText:', (mpError as any).statusText);
      
      // Retornar erro mais específico do Mercado Pago
      return new Response(JSON.stringify({ 
        error: `Erro no Mercado Pago: ${mpError.message}`,
        details: (mpError as any).details || mpError.message,
        status: (mpError as any).status || 'unknown',
        statusText: (mpError as any).statusText || 'unknown'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 422,
      });
    }

  } catch (error) {
    console.error('=== ERRO GERAL NA CRIAÇÃO DO PAGAMENTO ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido'),
      details: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
