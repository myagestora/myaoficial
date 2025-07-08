
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-MP-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logStep('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      logStep('Auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    logStep('User authenticated', { userId: user.id });

    const requestBody = await req.json()
    const { planId, frequency, paymentMethod, cardData } = requestBody

    logStep('Processing payment', { planId, frequency, paymentMethod, userId: user.id });

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      logStep('Error fetching plan', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    logStep('Plan found', { planName: plan.name });

    // Get Mercado Pago configuration
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .in('key', ['mercado_pago_access_token', 'mercado_pago_enabled'])

    if (configError) {
      logStep('Error fetching config', configError);
      return new Response(
        JSON.stringify({ error: 'Erro de configuração' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const config: Record<string, string> = {}
    configData.forEach(item => {
      config[item.key] = typeof item.value === 'string' ? 
        item.value.replace(/^"|"$/g, '') : 
        JSON.stringify(item.value).replace(/^"|"$/g, '')
    })

    const accessToken = config.mercado_pago_access_token
    const isEnabled = config.mercado_pago_enabled

    if (!accessToken || isEnabled !== 'true') {
      logStep('Mercado Pago not configured properly', { hasToken: !!accessToken, isEnabled });
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não está habilitado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    logStep('Mercado Pago config validated');

    const amount = frequency === 'monthly' ? plan.price_monthly : plan.price_yearly

    if (!amount) {
      logStep('Invalid amount for plan', { planId, frequency });
      return new Response(
        JSON.stringify({ error: 'Preço do plano não encontrado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to get user profile, but fallback to user data if not found
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Use profile data if available, otherwise fallback to user data
    const userEmail = profile?.email || user.email
    const userName = profile?.full_name || user.user_metadata?.full_name || 'Cliente'
    const userCpf = cardData?.cpf || profile?.whatsapp || '00000000000'

    logStep('User data prepared', { 
      userId: user.id, 
      hasProfile: !!profile, 
      email: userEmail,
      name: userName 
    });

    let paymentData: any = {
      transaction_amount: amount,
      description: `Assinatura ${plan.name} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      payer: {
        email: userEmail,
        first_name: userName,
        identification: {
          type: 'CPF',
          number: userCpf
        }
      },
      external_reference: `subscription_${user.id}_${planId}_${Date.now()}`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`
    }

    if (paymentMethod === 'pix') {
      paymentData.payment_method_id = 'pix'
      logStep('Setting up PIX payment');
    } else if (paymentMethod === 'credit_card' && cardData) {
      // Validate card data
      if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expirationMonth || 
          !cardData.expirationYear || !cardData.securityCode || !cardData.cpf) {
        return new Response(
          JSON.stringify({ error: 'Dados do cartão incompletos' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      logStep('Setting up credit card payment');
      paymentData.payment_method_id = 'master'
      paymentData.token = null
      paymentData.card = {
        number: cardData.cardNumber,
        holder_name: cardData.cardholderName,
        expiration_month: cardData.expirationMonth,
        expiration_year: cardData.expirationYear,
        security_code: cardData.securityCode
      }
      paymentData.payer.identification.number = cardData.cpf
    }

    logStep('Sending payment data to Mercado Pago', { amount, paymentMethod });

    // Create payment with Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}_${planId}_${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    })

    const mpResult = await mpResponse.json()
    logStep('Mercado Pago response', { status: mpResponse.status, result: mpResult });

    if (!mpResponse.ok) {
      logStep('Mercado Pago API error', mpResult);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar pagamento',
          details: mpResult.message || mpResult.error || 'Erro desconhecido'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    logStep('Payment created successfully', { paymentId: mpResult.id });

    // Store payment in database
    const { error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        payment_method: paymentMethod,
        status: mpResult.status,
        mercado_pago_payment_id: mpResult.id?.toString(),
        currency: 'BRL'
      })

    if (paymentError) {
      logStep('Error saving payment to database', paymentError);
    }

    // Return payment result
    let response: any = {
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      id: mpResult.id
    }

    // For PIX payments, include QR code data
    if (paymentMethod === 'pix' && mpResult.point_of_interaction?.transaction_data) {
      response.pix_data = {
        qr_code: mpResult.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: mpResult.point_of_interaction.transaction_data.qr_code_base64
      }
      logStep('PIX QR code generated successfully');
    }

    // If payment is approved, activate subscription
    if (mpResult.status === 'approved') {
      logStep('Payment approved, activating subscription...');
      
      const subscriptionEndDate = new Date()
      if (frequency === 'monthly') {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1)
      } else {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)
      }

      const { error: subscriptionError } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: subscriptionEndDate.toISOString()
        })

      if (subscriptionError) {
        logStep('Error creating subscription', subscriptionError);
      } else {
        logStep('Subscription created successfully');
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    logStep('General error', { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
