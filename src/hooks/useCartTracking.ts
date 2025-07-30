import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface CartSessionData {
  sessionId: string
  planId: string
  frequency: 'monthly' | 'yearly'
  amount: number
  paymentMethod?: string
  userEmail?: string
  userWhatsapp?: string
  userName?: string
}

interface CartTrackingResult {
  trackSession: (data: CartSessionData) => Promise<void>
  completeSession: (sessionId: string) => Promise<void>
  isTracking: boolean
  error: string | null
}

export function useCartTracking(): CartTrackingResult {
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trackSession = useCallback(async (data: CartSessionData) => {
    try {
      setIsTracking(true)
      setError(null)

      console.log('🛒 Tracking cart session:', data)

      const { data: responseData, error: invokeError } = await supabase.functions.invoke('track-cart-session', {
        body: {
          sessionId: data.sessionId,
          planId: data.planId,
          frequency: data.frequency,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          userEmail: data.userEmail,
          userWhatsapp: data.userWhatsapp,
          userName: data.userName
        }
      })

      console.log('📡 Edge Function response:', { responseData, invokeError })

      if (invokeError) {
        console.error('❌ Error tracking cart session:', invokeError)
        setError('Falha ao rastrear sessão do carrinho')
        return
      }

      console.log('✅ Cart session tracked successfully')

    } catch (err) {
      console.error('❌ Error in trackSession:', err)
      setError('Erro interno ao rastrear carrinho')
    } finally {
      setIsTracking(false)
    }
  }, [])

  const completeSession = useCallback(async (sessionId: string) => {
    try {
      console.log('✅ Completing cart session:', sessionId)

      // Usar Edge Function para completar a sessão
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('track-cart-session', {
        body: {
          action: 'complete',
          sessionId: sessionId
        }
      })

      if (invokeError) {
        console.error('❌ Error completing cart session:', invokeError)
        setError('Falha ao finalizar sessão do carrinho')
        return
      }

      console.log('✅ Cart session completed successfully:', responseData)

    } catch (err) {
      console.error('❌ Error in completeSession:', err)
      setError('Erro interno ao finalizar carrinho')
    }
  }, [])

  return {
    trackSession,
    completeSession,
    isTracking,
    error
  }
} 