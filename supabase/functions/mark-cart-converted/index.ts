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

    const body = await req.json()
    const { userEmail, userWhatsapp, userId } = body

    console.log('🔄 Marking cart sessions as converted for:', {
      userEmail,
      userWhatsapp,
      userId
    })

    if (!userEmail && !userWhatsapp && !userId) {
      return new Response(
        JSON.stringify({ error: 'userEmail, userWhatsapp, or userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar sessões de carrinho que podem ser convertidas
    let query = supabase
      .from('cart_sessions')
      .select('id, session_id, user_email, user_whatsapp, status, created_at')
      .in('status', ['active', 'abandoned'])

    // Aplicar filtros baseados nos dados fornecidos
    if (userId) {
      // Se temos userId, buscar por email do usuário
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      if (userProfile?.email) {
        query = query.eq('user_email', userProfile.email)
      }
    } else if (userEmail) {
      query = query.eq('user_email', userEmail)
    } else if (userWhatsapp) {
      query = query.eq('user_whatsapp', userWhatsapp)
    }

    const { data: sessionsToConvert, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Error fetching cart sessions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cart sessions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sessionsToConvert || sessionsToConvert.length === 0) {
      console.log('ℹ️ No cart sessions found to convert')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No cart sessions found to convert',
          converted_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${sessionsToConvert.length} sessions to convert`)

    // Atualizar status das sessões para 'converted'
    const sessionIds = sessionsToConvert.map(s => s.id)
    
    const { error: updateError } = await supabase
      .from('cart_sessions')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        metadata: {
          conversion_source: 'user_activation',
          converted_at: new Date().toISOString(),
          user_identifier: userEmail || userWhatsapp || userId
        }
      })
      .in('id', sessionIds)

    if (updateError) {
      console.error('❌ Error converting cart sessions:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to convert cart sessions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Successfully converted ${sessionsToConvert.length} cart sessions`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cart sessions marked as converted',
        converted_count: sessionsToConvert.length,
        sessions: sessionsToConvert.map(s => ({
          session_id: s.session_id,
          user_email: s.user_email,
          user_whatsapp: s.user_whatsapp,
          previous_status: s.status
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in mark-cart-converted:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 