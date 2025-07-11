import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuickTransactionRequest {
  user_id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  description?: string;
  date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate API key from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validate API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      console.log('Invalid API key:', apiKey);
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    const { 
      user_id, 
      title, 
      amount, 
      type, 
      category_id, 
      description, 
      date
    }: QuickTransactionRequest = await req.json()

    // Validar dados obrigatórios
    if (!user_id || !title || !amount || !type || !category_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['user_id', 'title', 'amount', 'type', 'category_id']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário existe e está ativo
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_status')
      .eq('id', user_id)
      .eq('account_status', 'active')
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se categoria existe e pertence ao usuário
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('id', category_id)
      .or(`user_id.eq.${user_id},is_default.eq.true`)
      .single()

    if (categoryError || !category) {
      return new Response(
        JSON.stringify({ error: 'Category not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar transação
    const transactionDate = date || new Date().toISOString().split('T')[0]
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        title,
        description: description || `Transação criada via WhatsApp`,
        amount: Math.abs(amount),
        type,
        date: transactionDate,
        category_id: category_id
      })
      .select(`
        id, title, description, amount, type, date,
        categories (name, color)
      `)
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create transaction',
          details: transactionError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar meta ativa da categoria se existir
    const { data: categoryGoal } = await supabase
      .from('goals')
      .select('id, title, target_amount, current_amount, status, goal_type, month_year')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .eq('status', 'active')
      .eq('goal_type', 'monthly_budget')
      .eq('month_year', transactionDate.substring(0, 7)) // YYYY-MM format
      .maybeSingle()

    console.log(`Quick transaction created for user ${user_id}: ${type} of R$ ${amount}`)

    const response: any = {
      success: true,
      transaction,
      message: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${amount.toFixed(2)} registrada com sucesso!`
    }

    // Adicionar meta se existir
    if (categoryGoal) {
      response.goal = categoryGoal
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Quick transaction error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})