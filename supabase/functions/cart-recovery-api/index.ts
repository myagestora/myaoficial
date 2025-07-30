import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    console.log(`📡 API Request: ${method} ${path}`)

    // Verificar autenticação (API Key padrão do Supabase)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - API Key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    if (apiKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API Key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rotas da API
    if (path === '/api/cart-recovery/abandoned' && method === 'GET') {
      return await getAbandonedCarts(supabase, req)
    }
    
    if (path === '/api/cart-recovery/config' && method === 'GET') {
      return await getRecoveryConfig(supabase)
    }
    
    if (path === '/api/cart-recovery/session' && method === 'PUT') {
      const body = await req.json()
      return await updateSessionStatus(body, supabase)
    }
    
    if (path === '/api/cart-recovery/attempt' && method === 'POST') {
      const body = await req.json()
      return await recordAttempt(body, supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in cart-recovery-api:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// GET /api/cart-recovery/abandoned - Listar carrinhos abandonados
async function getAbandonedCarts(supabase: any, req: Request) {
  try {
    const url = new URL(req.url)
    const searchParams = url.searchParams
    
    // Filtros disponíveis
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const email = searchParams.get('email')
    const whatsapp = searchParams.get('whatsapp')
    const minutes = parseInt(searchParams.get('minutes') || '0')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 Filtros aplicados:', {
      status,
      startDate,
      endDate,
      email,
      whatsapp,
      minutes,
      limit,
      offset
    })

    let query = supabase
      .from('cart_sessions')
      .select(`
        id,
        session_id,
        user_name,
        user_email,
        user_whatsapp,
        amount,
        frequency,
        created_at,
        abandoned_at,
        status,
        subscription_plans (
          id,
          name,
          description
        )
      `)

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
    } else {
      // Se não especificar status, buscar apenas abandonados
      query = query.eq('status', 'abandoned')
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (minutes > 0) {
      // Filtrar sessões dos últimos X minutos
      const minutesAgo = new Date(Date.now() - minutes * 60 * 1000)
      query = query.gte('created_at', minutesAgo.toISOString())
    }

    if (email) {
      query = query.ilike('user_email', `%${email}%`)
    }

    if (whatsapp) {
      query = query.ilike('user_whatsapp', `%${whatsapp}%`)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)
    query = query.order('abandoned_at', { ascending: false })

    const { data: abandonedCarts, error, count } = await query

    if (error) {
      console.error('❌ Error fetching abandoned carts:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch abandoned carts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar tentativas para cada sessão
    const cartsWithAttempts = await Promise.all(
      abandonedCarts.map(async (cart) => {
        const { data: attempts } = await supabase
          .from('cart_recovery_attempts')
          .select('attempt_number, method, status, sent_at, error_message')
          .eq('cart_session_id', cart.id)
          .order('attempt_number', { ascending: true })

        return {
          ...cart,
          attempts: attempts || []
        }
      })
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cartsWithAttempts,
        count: cartsWithAttempts.length,
        total_count: count || 0,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < (count || 0)
        },
        filters: {
          status,
          start_date: startDate,
          end_date: endDate,
          email,
          whatsapp,
          minutes
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in getAbandonedCarts:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// GET /api/cart-recovery/config - Obter configurações de recuperação
async function getRecoveryConfig(supabase: any) {
  try {
    // Buscar configuração
    const { data: config, error: configError } = await supabase
      .from('cart_recovery_config')
      .select('*')
      .eq('enabled', true)
      .single()

    if (configError) {
      console.error('❌ Error fetching recovery config:', configError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recovery config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar templates
    const { data: templates, error: templatesError } = await supabase
      .from('cart_recovery_templates')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (templatesError) {
      console.error('❌ Error fetching templates:', templatesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch templates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configurações do WhatsApp
    const { data: whatsappConfig } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['evolution_api_url', 'evolution_api_key', 'evolution_instance_name'])

    const whatsappSettings: Record<string, string> = {}
    whatsappConfig?.forEach(item => {
      whatsappSettings[item.key] = item.value
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          config,
          templates,
          whatsapp: whatsappSettings
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in getRecoveryConfig:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// PUT /api/cart-recovery/session - Atualizar status da sessão
async function updateSessionStatus(body: any, supabase: any) {
  try {
    const { sessionId, status, metadata } = body

    if (!sessionId || !status) {
      return new Response(
        JSON.stringify({ error: 'sessionId and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updateData: any = { status }
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'converted') {
      updateData.converted_at = new Date().toISOString()
    }

    if (metadata) {
      updateData.metadata = metadata
    }

    const { error } = await supabase
      .from('cart_sessions')
      .update(updateData)
      .eq('session_id', sessionId)

    if (error) {
      console.error('❌ Error updating session status:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update session status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session status updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in updateSessionStatus:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// POST /api/cart-recovery/attempt - Registrar tentativa de envio
async function recordAttempt(body: any, supabase: any) {
  try {
    const { 
      sessionId, 
      attemptNumber, 
      method, 
      status, 
      messageContent, 
      messageId, 
      errorMessage 
    } = body

    if (!sessionId || !attemptNumber || !method || !status) {
      return new Response(
        JSON.stringify({ error: 'sessionId, attemptNumber, method, and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar cart_session_id pelo session_id
    const { data: session, error: sessionError } = await supabase
      .from('cart_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attemptData: any = {
      cart_session_id: session.id,
      attempt_number: attemptNumber,
      method,
      status,
      message_content: messageContent
    }

    if (status === 'sent') {
      attemptData.sent_at = new Date().toISOString()
      attemptData.whatsapp_message_id = messageId
    } else if (status === 'failed') {
      attemptData.error_message = errorMessage
    }

    const { error } = await supabase
      .from('cart_recovery_attempts')
      .insert(attemptData)

    if (error) {
      console.error('❌ Error recording attempt:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to record attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Attempt recorded successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in recordAttempt:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
} 