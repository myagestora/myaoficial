
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { planId, frequency, paymentMethod, cardData } = await req.json()

    console.log('Processando pagamento:', { planId, frequency, paymentMethod, userId: user.id })

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      console.error('Erro ao buscar plano:', planError)
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Mercado Pago configuration
    const { data: configData, error: configError } = await supabaseClient
      .from('system_config')
      .select('key, value')
      .in('key', ['mercado_pago_access_token', 'mercado_pago_enabled'])

    if (configError) {
      console.error('Erro ao buscar configuração:', configError)
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
      console.error('Mercado Pago não configurado')
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não está habilitado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const amount = frequency === 'monthly' ? plan.price_monthly : plan.price_yearly

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError)
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let paymentData: any = {
      transaction_amount: amount,
      description: `Assinatura ${plan.name} - ${frequency === 'monthly' ? 'Mensal' : 'Anual'}`,
      payer: {
        email: profile.email || user.email,
        first_name: profile.full_name || 'Cliente',
        identification: {
          type: 'CPF',
          number: cardData?.cpf || '00000000000'
        }
      },
      external_reference: `subscription_${user.id}_${planId}_${Date.now()}`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`
    }

    if (paymentMethod === 'pix') {
      paymentData.payment_method_id = 'pix'
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

      paymentData.payment_method_id = 'master' // Will be determined by card number
      paymentData.token = null // Will be created by card data
      paymentData.card = {
        number: cardData.cardNumber,
        holder_name: cardData.cardholderName,
        expiration_month: cardData.expirationMonth,
        expiration_year: cardData.expirationYear,
        security_code: cardData.securityCode
      }
      paymentData.payer.identification.number = cardData.cpf
    }

    console.log('Enviando dados para Mercado Pago:', JSON.stringify(paymentData, null, 2))

    // Create payment with Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    })

    const mpResult = await mpResponse.json()
    console.log('Resposta do Mercado Pago:', JSON.stringify(mpResult, null, 2))

    if (!mpResponse.ok) {
      console.error('Erro da API do Mercado Pago:', mpResult)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar pagamento',
          details: mpResult.message || 'Erro desconhecido'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
      console.error('Erro ao salvar pagamento:', paymentError)
    }

    // Return payment result
    let response = {
      status: mpResult.status,
      status_detail: mpResult.status_detail,
      id: mpResult.id
    }

    // For PIX payments, include QR code data
    if (paymentMethod === 'pix' && mpResult.point_of_interaction?.transaction_data) {
      response = {
        ...response,
        pix_data: {
          qr_code: mpResult.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: mpResult.point_of_interaction.transaction_data.qr_code_base64
        }
      }
    }

    // If payment is approved, activate subscription
    if (mpResult.status === 'approved') {
      console.log('Pagamento aprovado, ativando assinatura...')
      
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
        console.error('Erro ao criar assinatura:', subscriptionError)
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
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
