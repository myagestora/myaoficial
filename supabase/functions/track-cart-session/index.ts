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
    
    // Verificar se é uma ação de completar sessão
    if (body.action === 'complete') {
      const { sessionId } = body
      
      console.log('✅ Completing cart session:', sessionId)
      
      const { error: updateError } = await supabase
        .from('cart_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (updateError) {
        console.error('❌ Error completing cart session:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to complete cart session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cart session completed',
          sessionId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extrair dados para tracking normal
    const { 
      sessionId, 
      planId, 
      frequency, 
      amount, 
      paymentMethod,
      userEmail,
      userWhatsapp,
      userName 
    } = body

    console.log('🛒 Tracking cart session:', {
      sessionId,
      planId,
      frequency,
      amount,
      paymentMethod,
      userEmail,
      userWhatsapp,
      userName
    })

    // Verificar se já existe uma sessão com o mesmo sessionId
    const { data: existingSession } = await supabase
      .from('cart_sessions')
      .select('id, status')
      .eq('session_id', sessionId)
      .single()

    if (existingSession) {
      console.log('📝 Updating existing cart session:', existingSession.id)
      
      // Verificar se o usuário já existe no sistema
      let userId = null
      if (userEmail) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single()
        
        if (existingUser) {
          userId = existingUser.id
          console.log('🔗 Usuário encontrado, vinculando user_id:', userId)
        }
      }

      const { error: updateError } = await supabase
        .from('cart_sessions')
        .update({
          plan_id: planId,
          frequency,
          amount,
          payment_method: paymentMethod,
          user_email: userEmail,
          user_whatsapp: userWhatsapp,
          user_name: userName,
          user_id: userId, // Vincular user_id se encontrado
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id)

      if (updateError) {
        console.error('❌ Error updating cart session:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update cart session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cart session updated',
          sessionId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o usuário já existe no sistema
    let userId = null
    if (userEmail) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single()
      
      if (existingUser) {
        userId = existingUser.id
        console.log('🔗 Usuário encontrado, vinculando user_id:', userId)
      }
    }

    // Criar nova sessão
    const { data: newSession, error: insertError } = await supabase
      .from('cart_sessions')
      .insert({
        session_id: sessionId,
        plan_id: planId,
        frequency,
        amount,
        payment_method: paymentMethod,
        user_email: userEmail,
        user_whatsapp: userWhatsapp,
        user_name: userName,
        user_id: userId, // Vincular user_id se encontrado
        status: 'active'
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating cart session:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create cart session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Cart session created:', newSession.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cart session created',
        sessionId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in track-cart-session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 