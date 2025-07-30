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

    console.log(`📡 Cron Management API: ${method} ${path}`)

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Service Role Key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    if (apiKey !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Invalid Service Role Key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rotas da API
    if (path === '/api/cron/list' && method === 'GET') {
      return await listCronJobs(supabase)
    }
    
    if (path === '/api/cron/disable' && method === 'POST') {
      const body = await req.json()
      return await disableCronJobs(body, supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in manage-cron:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// GET /api/cron/list - Listar cron jobs
async function listCronJobs(supabase: any) {
  try {
    // Tentar acessar a tabela cron.job diretamente
    const { data: cronJobs, error } = await supabase
      .from('cron.job')
      .select('jobid, schedule, command, active')
      .order('jobid', { ascending: true })

    if (error) {
      console.error('❌ Error accessing cron.job:', error)
      
      // Se não conseguir acessar, retornar erro com instruções
      return new Response(
        JSON.stringify({ 
          error: 'Cannot access cron jobs directly',
          message: 'Use Supabase Dashboard → Database → Extensions → pg_cron to manage cron jobs',
          instructions: [
            '1. Go to Supabase Dashboard',
            '2. Navigate to Database → Extensions',
            '3. Find pg_cron extension',
            '4. Manage cron jobs from there'
          ]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filtrar jobs relacionados a cart recovery
    const cartRecoveryJobs = cronJobs?.filter(job => 
      job.command.includes('cart_recovery') || 
      job.command.includes('process-cart-recovery') ||
      job.command.includes('track-cart-session')
    ) || []

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          all_jobs: cronJobs,
          cart_recovery_jobs: cartRecoveryJobs,
          total_jobs: cronJobs?.length || 0,
          cart_recovery_count: cartRecoveryJobs.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in listCronJobs:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// POST /api/cron/disable - Desativar cron jobs
async function disableCronJobs(body: any, supabase: any) {
  try {
    const { jobIds, pattern } = body

    if (!jobIds && !pattern) {
      return new Response(
        JSON.stringify({ error: 'jobIds or pattern is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updateQuery = supabase
      .from('cron.job')
      .update({ active: false })

    if (jobIds && jobIds.length > 0) {
      updateQuery = updateQuery.in('jobid', jobIds)
    } else if (pattern) {
      // Usar RPC para busca por padrão (mais seguro)
      const { data, error } = await supabase.rpc('disable_cron_jobs_by_pattern', {
        search_pattern: pattern
      })

      if (error) {
        console.error('❌ Error disabling cron jobs by pattern:', error)
        return new Response(
          JSON.stringify({ 
            error: 'Cannot disable cron jobs directly',
            message: 'Use Supabase Dashboard to manage cron jobs',
            instructions: [
              '1. Go to Supabase Dashboard',
              '2. Navigate to Database → Extensions',
              '3. Find pg_cron extension',
              '4. Disable cart recovery related jobs'
            ]
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cron jobs disabled successfully',
          disabled_count: data?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await updateQuery

    if (error) {
      console.error('❌ Error disabling cron jobs:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Cannot disable cron jobs directly',
          message: 'Use Supabase Dashboard to manage cron jobs'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cron jobs disabled successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in disableCronJobs:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
} 