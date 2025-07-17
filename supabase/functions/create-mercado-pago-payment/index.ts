
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PaymentRequest } from './types.ts';
import { validateCardData } from './validation.ts';
import { buildPaymentData } from './payment-builder.ts';
import { createCardToken } from './card-token-service.ts';
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
    // Parse do corpo da requisição
    let requestBody: PaymentRequest;
    try {
      const bodyText = await req.text();
      console.log('Request body raw:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        return new Response(JSON.stringify({ 
          error: 'Corpo da requisição está vazio'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('Request body parsed:', {
        planId: requestBody.planId,
        frequency: requestBody.frequency,
        paymentMethod: requestBody.paymentMethod,
        hasCardData: !!requestBody.cardData
      });
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
    
    // Validação de parâmetros obrigatórios
    if (!planId || !frequency || !paymentMethod) {
      console.error('Parâmetros obrigatórios faltando');
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: planId, frequency, paymentMethod' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createSupabaseClient();

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Token de autorização necessário'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = await authenticateUser(supabaseClient, authHeader);
    console.log('Usuário autenticado:', user.id);

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
    console.log('Plano encontrado:', planData.name);

    // Buscar token do Mercado Pago
    const accessToken = await getMercadoPagoToken(supabaseClient);
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Sistema de pagamento não configurado'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Determinar valor baseado na frequência
    const amount = frequency === 'monthly' ? planData.price_monthly : planData.price_yearly;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ 
        error: `Preço não disponível para frequência ${frequency}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Criar ou buscar assinatura do usuário
    const subscriptionId = await createOrGetSubscription(supabaseClient, user.id, planId, frequency);

    // Criar referência externa única
    const externalReference = `${user.id}_${planId}_${Date.now()}`;

    // Criar dados do pagamento para o Mercado Pago
    let paymentData = buildPaymentData(
      amount,
      planData.name,
      frequency,
      externalReference,
      user.email,
      user.user_metadata?.full_name || user.user_metadata?.name,
      paymentMethod,
      cardData
    );

    // Se for cartão de crédito, criar token primeiro
    if (paymentMethod === 'credit_card' && cardData) {
      console.log('Criando token do cartão...');
      
      try {
        const cardToken = await createCardToken(cardData, accessToken);
        paymentData.token = cardToken;
        // Remove o placeholder
        delete paymentData.payment_method_id;
        console.log('Token do cartão criado com sucesso');
      } catch (tokenError) {
        console.error('Erro ao criar token do cartão:', tokenError);
        return new Response(JSON.stringify({ 
          error: `Erro ao processar cartão: ${tokenError.message}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 422,
        });
      }
    }

    console.log('Enviando pagamento para o Mercado Pago...');

    try {
      // Criar pagamento no Mercado Pago
      const mpPayment = await createMercadoPagoPayment(paymentData, accessToken, externalReference);

      console.log('=== PAGAMENTO MERCADO PAGO CRIADO ===');
      console.log('Payment ID:', mpPayment.id);
      console.log('Status:', mpPayment.status);

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
        await activateSubscription(supabaseClient, subscriptionId, user.id, frequency);
      }

      // Preparar resposta
      const response: any = {
        id: mpPayment.id,
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
        payment_method_id: mpPayment.payment_method_id,
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
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (mpError) {
      console.error('=== ERRO ESPECÍFICO DO MERCADO PAGO ===');
      console.error('MP Error:', mpError);
      
      return new Response(JSON.stringify({ 
        error: `Erro no processamento: ${mpError.message}`,
        details: (mpError as any).details || mpError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 422,
      });
    }

  } catch (error) {
    console.error('=== ERRO GERAL NA CRIAÇÃO DO PAGAMENTO ===');
    console.error('Error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido')
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
