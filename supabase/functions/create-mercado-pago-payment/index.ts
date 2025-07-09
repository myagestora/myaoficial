
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
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient();

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    const user = await authenticateUser(supabaseClient, authHeader);

    // Parse do corpo da requisição
    let requestBody: PaymentRequest;
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

    // Validar dados do cartão se necessário
    if (paymentMethod === 'credit_card') {
      if (!cardData) {
        return new Response(JSON.stringify({ 
          error: 'Dados do cartão são obrigatórios para pagamento com cartão' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

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
    }

    // Buscar dados do plano
    const planData = await getPlanData(supabaseClient, planId);

    // Buscar token do Mercado Pago
    const accessToken = await getMercadoPagoToken(supabaseClient);

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
    const subscriptionId = await createOrGetSubscription(supabaseClient, user.id, planId, frequency);

    // Criar referência externa única
    const externalReference = `${user.id}_${planId}_${Date.now()}`;
    console.log('External reference:', externalReference);

    // Criar dados do pagamento para o Mercado Pago
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

    // Criar pagamento no Mercado Pago
    const mpPayment = await createMercadoPagoPayment(paymentData, accessToken, externalReference);

    // Salvar o pagamento no banco de dados
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

    // Se foi aprovado imediatamente, ativar assinatura
    if (mpPayment.status === 'approved') {
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
