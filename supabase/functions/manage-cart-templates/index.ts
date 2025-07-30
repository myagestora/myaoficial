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

    console.log(`📡 Template Management API: ${method} ${path}`)

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
    if (path === '/manage-cart-templates' && method === 'POST') {
      return await syncTemplates(supabase)
    }
    
    if (path === '/manage-cart-templates' && method === 'GET') {
      return await listTemplates(supabase)
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in manage-cart-templates:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// POST /api/cart-templates/sync - Sincronizar templates com configuração
async function syncTemplates(supabase: any) {
  try {
    console.log('🔄 Sincronizando templates com configuração...')

    // Buscar configuração atual
    const { data: config, error: configError } = await supabase
      .from('cart_recovery_config')
      .select('max_attempts')
      .eq('enabled', true)
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuração de recuperação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const maxAttempts = config.max_attempts
    console.log(`📊 Configuração atual: ${maxAttempts} tentativas`)

    // Buscar templates existentes
    const { data: existingTemplates, error: templatesError } = await supabase
      .from('cart_recovery_templates')
      .select('id, name, type, attempt_number')
      .order('attempt_number', { ascending: true })

    if (templatesError) {
      console.error('❌ Error fetching existing templates:', templatesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing templates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Templates existentes: ${existingTemplates?.length || 0}`)

    // Criar templates padrão se não existirem
    const templatesToCreate = []
    const templatesToUpdate = []

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const templateName = `Tentativa ${attempt}`
      
      // Verificar se template já existe
      const existingTemplate = existingTemplates?.find(t => 
        t.name === templateName && t.attempt_number === attempt
      )

      if (!existingTemplate) {
        // Criar novo template
        templatesToCreate.push({
          name: templateName,
          type: 'whatsapp',
          attempt_number: attempt,
          content: generateDefaultTemplate(attempt, maxAttempts),
          is_active: true
        })

        templatesToCreate.push({
          name: templateName,
          type: 'email',
          attempt_number: attempt,
          content: generateDefaultEmailTemplate(attempt, maxAttempts),
          is_active: true
        })
      }
    }

    // Remover templates extras (se max_attempts foi reduzido)
    const templatesToDelete = existingTemplates?.filter(t => t.attempt_number > maxAttempts) || []

    console.log(`📝 Templates para criar: ${templatesToCreate.length}`)
    console.log(`🗑️ Templates para deletar: ${templatesToDelete.length}`)

    // Executar operações
    const results = {
      created: 0,
      deleted: 0,
      errors: []
    }

    // Criar novos templates
    if (templatesToCreate.length > 0) {
      const { error: createError } = await supabase
        .from('cart_recovery_templates')
        .insert(templatesToCreate)

      if (createError) {
        console.error('❌ Error creating templates:', createError)
        results.errors.push(`Erro ao criar templates: ${createError.message}`)
      } else {
        results.created = templatesToCreate.length
        console.log(`✅ ${templatesToCreate.length} templates criados`)
      }
    }

    // Deletar templates extras
    if (templatesToDelete.length > 0) {
      const templateIds = templatesToDelete.map(t => t.id)
      const { error: deleteError } = await supabase
        .from('cart_recovery_templates')
        .delete()
        .in('id', templateIds)

      if (deleteError) {
        console.error('❌ Error deleting templates:', deleteError)
        results.errors.push(`Erro ao deletar templates: ${deleteError.message}`)
      } else {
        results.deleted = templatesToDelete.length
        console.log(`✅ ${templatesToDelete.length} templates deletados`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Templates sincronizados com sucesso',
        max_attempts: maxAttempts,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in syncTemplates:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// GET /api/cart-templates/list - Listar templates
async function listTemplates(supabase: any) {
  try {
    const { data: templates, error } = await supabase
      .from('cart_recovery_templates')
      .select('*')
      .order('attempt_number', { ascending: true })
      .order('type', { ascending: true })

    if (error) {
      console.error('❌ Error fetching templates:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch templates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: templates,
        count: templates?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in listTemplates:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Função para gerar template padrão do WhatsApp
function generateDefaultTemplate(attempt: number, maxAttempts: number): string {
  const discountPercentage = attempt === 1 ? 10 : attempt === 2 ? 15 : 20
  const urgency = attempt === maxAttempts ? 'ÚLTIMA CHANCE' : 'Oferta especial'
  
  return `Olá {{user_name}}! 👋

Notamos que você estava interessado no plano {{plan_name}} por {{amount}}/{{frequency}}, mas não finalizou sua assinatura.

${urgency}: ${discountPercentage}% de desconto!

💰 Valor original: {{original_amount}}
🎉 Com desconto: {{discount_amount}}

Clique aqui para finalizar: {{checkout_url}}

Atenciosamente,
Equipe MYA`
}

// Função para gerar template padrão de email
function generateDefaultEmailTemplate(attempt: number, maxAttempts: number): string {
  const discountPercentage = attempt === 1 ? 10 : attempt === 2 ? 15 : 20
  const urgency = attempt === maxAttempts ? 'ÚLTIMA CHANCE' : 'Oferta especial'
  
  return `Olá {{user_name}},

Notamos que você estava interessado no plano {{plan_name}} por {{amount}}/{{frequency}}, mas não finalizou sua assinatura.

${urgency}: ${discountPercentage}% de desconto!

💰 Valor original: {{original_amount}}
🎉 Com desconto: {{discount_amount}}

Clique aqui para finalizar: {{checkout_url}}

Atenciosamente,
Equipe MYA`
} 