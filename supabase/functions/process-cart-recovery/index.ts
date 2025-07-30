import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Processing cart recovery schedules...')

    // Buscar agendamentos pendentes que devem ser executados agora
    const now = new Date().toISOString()
    const { data: pendingSchedules, error: fetchError } = await supabase
      .from('cart_recovery_schedules')
      .select(`
        *,
        cart_sessions (
          id,
          session_id,
          user_name,
          user_email,
          user_whatsapp,
          amount,
          frequency,
          status,
          subscription_plans(name)
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Error fetching pending schedules:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending schedules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingSchedules || pendingSchedules.length === 0) {
      console.log('ℹ️ No pending schedules to process')
      return new Response(
        JSON.stringify({ message: 'No pending schedules to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${pendingSchedules.length} pending schedules to process`)

    // Processar cada agendamento
    const results = []
    for (const schedule of pendingSchedules) {
      try {
        console.log(`🔄 Processing schedule ${schedule.id} for session ${schedule.cart_sessions.session_id}`)

        // Marcar como processando
        await supabase
          .from('cart_recovery_schedules')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)

        // Se attempt_number = 0, é verificação de abandono
        if (schedule.attempt_number === 0) {
          console.log(`🔍 Processing abandonment check for session ${schedule.cart_sessions.session_id}`)
          
          // Verificar se a sessão ainda está ativa
          if (schedule.cart_sessions.status === 'active') {
            console.log(`🔄 Marking session as abandoned: ${schedule.cart_sessions.session_id}`)
            
            // Marcar como abandonada
            const { error: updateError } = await supabase
              .from('cart_sessions')
              .update({
                status: 'abandoned',
                abandoned_at: new Date().toISOString()
              })
              .eq('id', schedule.cart_sessions.id)

            if (updateError) {
              console.error('❌ Error marking session as abandoned:', updateError)
              await supabase
                .from('cart_recovery_schedules')
                .update({ 
                  status: 'failed',
                  processed_at: new Date().toISOString(),
                  error_message: updateError.message
                })
                .eq('id', schedule.id)
              continue
            }

            console.log('✅ Session marked as abandoned successfully')

            // Iniciar processo de recuperação
            await initiateRecoveryProcess(schedule.cart_sessions.id, supabase)
          } else {
            console.log(`ℹ️ Session ${schedule.cart_sessions.session_id} is no longer active, skipping abandonment check`)
          }
        } else {
          // Verificar se a sessão ainda está abandonada para envio de mensagem
          if (schedule.cart_sessions.status !== 'abandoned') {
            console.log(`⚠️ Session ${schedule.cart_sessions.session_id} is no longer abandoned, skipping message`)
            await supabase
              .from('cart_recovery_schedules')
              .update({ 
                status: 'completed',
                processed_at: new Date().toISOString(),
                error_message: 'Session no longer abandoned'
              })
              .eq('id', schedule.id)
            continue
          }

          // Enviar mensagem de recuperação
          await sendRecoveryMessage(schedule, supabase)
        }

        // Marcar como completado
        await supabase
          .from('cart_recovery_schedules')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', schedule.id)

        results.push({
          scheduleId: schedule.id,
          sessionId: schedule.cart_sessions.session_id,
          attemptNumber: schedule.attempt_number,
          status: 'success'
        })

      } catch (error) {
        console.error(`❌ Error processing schedule ${schedule.id}:`, error)
        
        // Marcar como falhou
        await supabase
          .from('cart_recovery_schedules')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', schedule.id)

        results.push({
          scheduleId: schedule.id,
          sessionId: schedule.cart_sessions.session_id,
          attemptNumber: schedule.attempt_number,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`✅ Processed ${results.length} schedules`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in process-cart-recovery:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function initiateRecoveryProcess(sessionId: string, supabase: any) {
  try {
    console.log('🚀 Initiating recovery process for session:', sessionId)
    
    // Verificar configurações de recuperação
    const { data: config, error: configError } = await supabase
      .from('cart_recovery_config')
      .select('*')
      .eq('enabled', true)
      .single()

    if (configError) {
      console.error('❌ Error fetching recovery config:', configError)
      return
    }

    if (!config) {
      console.log('⚠️ No recovery config found')
      return
    }

    console.log('📋 Recovery config:', {
      enabled: config.enabled,
      whatsapp_enabled: config.whatsapp_enabled,
      delay_minutes: config.delay_minutes,
      max_attempts: config.max_attempts
    })

    if (!config.whatsapp_enabled) {
      console.log('⚠️ WhatsApp recovery disabled')
      return
    }

    console.log(`⏰ Scheduling first recovery attempt in ${config.delay_minutes} minutes`)

    // Registrar agendamento da primeira tentativa
    const scheduledTime = new Date(Date.now() + config.delay_minutes * 60 * 1000)
    
    console.log(`⏰ Scheduling first recovery attempt for: ${scheduledTime.toISOString()}`)
    
    // Inserir registro de agendamento
    const { error: scheduleError } = await supabase
      .from('cart_recovery_schedules')
      .insert({
        cart_session_id: sessionId,
        attempt_number: 1,
        scheduled_at: scheduledTime.toISOString(),
        status: 'pending'
      })

    if (scheduleError) {
      console.error('❌ Error scheduling recovery:', scheduleError)
    } else {
      console.log('✅ Recovery scheduled successfully')
    }

  } catch (error) {
    console.error('❌ Error initiating recovery process:', error)
  }
}

async function sendRecoveryMessage(schedule: any, supabase: any) {
  try {
    const session = schedule.cart_sessions
    const attemptNumber = schedule.attempt_number

    console.log(`📱 Sending recovery message #${attemptNumber} for session:`, session.session_id)
    
    // Buscar template da mensagem
    const { data: template } = await supabase
      .from('cart_recovery_templates')
      .select('*')
      .eq('type', 'whatsapp')
      .eq('is_active', true)
      .ilike('name', `%${attemptNumber}%`)
      .single()

    if (!template) {
      throw new Error(`Template not found for attempt ${attemptNumber}`)
    }

    // Preparar variáveis da mensagem
    const variables = {
      user_name: session.user_name || 'Cliente',
      plan_name: session.subscription_plans?.name || 'Plano',
      amount: `R$ ${session.amount}`,
      frequency: session.frequency === 'monthly' ? 'mês' : 'ano',
      original_amount: `R$ ${session.amount}`,
      discount_amount: `R$ ${(session.amount * 0.9).toFixed(2)}`,
      final_amount: `R$ ${(session.amount * 0.85).toFixed(2)}`,
      checkout_url: `${Deno.env.get('FRONTEND_URL') || 'https://myagestora.com.br'}/checkout?session=${session.session_id}`
    }

    // Substituir variáveis no template
    let messageContent = template.content
    Object.entries(variables).forEach(([key, value]) => {
      messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // Registrar tentativa
    const { data: attempt } = await supabase
      .from('cart_recovery_attempts')
      .insert({
        cart_session_id: session.id,
        attempt_number: attemptNumber,
        method: 'whatsapp',
        status: 'pending',
        message_content: messageContent
      })
      .select()
      .single()

    // Enviar mensagem via Evolution API
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')
    const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME')

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      throw new Error('Evolution API not configured')
    }

    // Remover o + do número do WhatsApp para a Evolution API
    const cleanWhatsAppNumber = session.user_whatsapp?.replace(/^\+/, '') || ''
    
    console.log('📱 Sending WhatsApp to number:', cleanWhatsAppNumber)
    console.log('📱 Message content:', messageContent)

    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      },
      body: JSON.stringify({
        number: cleanWhatsAppNumber,
        text: messageContent
      })
    })

    const result = await response.json()

    if (response.ok && result.status === 'success') {
      console.log('✅ WhatsApp message sent successfully')
      await updateAttemptStatus(attempt.id, 'sent', null, supabase, result.key?.id)
      
      // Agendar próxima tentativa se necessário
      const { data: config } = await supabase
        .from('cart_recovery_config')
        .select('max_attempts, delay_minutes')
        .single()

      if (attemptNumber < config.max_attempts) {
        const nextScheduledTime = new Date(Date.now() + config.delay_minutes * 60 * 1000)
        
        await supabase
          .from('cart_recovery_schedules')
          .insert({
            cart_session_id: session.id,
            attempt_number: attemptNumber + 1,
            scheduled_at: nextScheduledTime.toISOString(),
            status: 'pending'
          })

        console.log(`⏰ Scheduled next attempt #${attemptNumber + 1} for ${nextScheduledTime.toISOString()}`)
      }
    } else {
      throw new Error(`Failed to send WhatsApp message: ${JSON.stringify(result)}`)
    }

  } catch (error) {
    console.error('❌ Error sending recovery message:', error)
    throw error
  }
}

async function updateAttemptStatus(attemptId: string, status: string, errorMessage?: string, supabase?: any, messageId?: string) {
  try {
    const updateData: any = { status }
    
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
      updateData.whatsapp_message_id = messageId
    } else if (status === 'failed') {
      updateData.error_message = errorMessage
    }

    await supabase
      .from('cart_recovery_attempts')
      .update(updateData)
      .eq('id', attemptId)

  } catch (error) {
    console.error('❌ Error updating attempt status:', error)
  }
} 