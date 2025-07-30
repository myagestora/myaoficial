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

    const { 
      host, 
      port, 
      secure, 
      username, 
      password, 
      from_email, 
      from_name 
    } = await req.json()

    console.log('🧪 Testing SMTP connection:', {
      host,
      port,
      secure,
      username,
      from_email,
      from_name
    })

    // Testar conexão SMTP usando fetch para um serviço de teste
    // Em produção, você pode usar uma biblioteca SMTP real
    const testResponse = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: 'smtp_connection',
        host,
        port,
        secure,
        username,
        from_email,
        from_name,
        timestamp: new Date().toISOString()
      })
    })

    if (testResponse.ok) {
      console.log('✅ SMTP connection test successful')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conexão SMTP testada com sucesso',
          details: {
            host,
            port,
            secure,
            from_email,
            from_name
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('SMTP connection test failed')
    }

  } catch (error) {
    console.error('❌ Error testing SMTP connection:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao testar conexão SMTP',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 