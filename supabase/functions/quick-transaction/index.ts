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
  category_name?: string;
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

    // Validar bot token do header Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const botToken = authHeader.replace('Bearer ', '')
    const validBotToken = Deno.env.get('WHATSAPP_BOT_TOKEN') || 'your-secure-bot-token'
    if (botToken !== validBotToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid bot token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      user_id, 
      title, 
      amount, 
      type, 
      category_name, 
      description, 
      date
    }: QuickTransactionRequest = await req.json()

    // Validar dados obrigatórios
    if (!user_id || !title || !amount || !type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['user_id', 'title', 'amount', 'type']
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

    // Buscar ou criar categoria
    let categoryId = null
    if (category_name) {
      // Primeiro, tentar encontrar categoria existente
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user_id)
        .ilike('name', category_name)
        .single()

      if (existingCategory) {
        categoryId = existingCategory.id
      } else {
        // Criar nova categoria se não existir
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: category_name,
            user_id: user_id,
            type: type,
            is_default: false
          })
          .select('id')
          .single()

        if (categoryError) {
          console.error('Error creating category:', categoryError)
        } else {
          categoryId = newCategory.id
        }
      }
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
        category_id: categoryId
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

    // Buscar saldo atualizado
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user_id)

    const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const totalExpenses = allTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const balance = totalIncome - totalExpenses

    console.log(`Quick transaction created for user ${user_id}: ${type} of R$ ${amount}`)

    return new Response(
      JSON.stringify({
        success: true,
        transaction,
        updated_balance: {
          balance,
          total_income: totalIncome,
          total_expenses: totalExpenses
        },
        message: `${type === 'income' ? 'Receita' : 'Despesa'} de R$ ${amount.toFixed(2)} registrada com sucesso!`
      }),
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