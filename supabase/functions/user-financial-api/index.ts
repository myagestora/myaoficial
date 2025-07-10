import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    
    console.log('URL pathname:', url.pathname)
    console.log('Path segments:', pathSegments)
    
    const userId = pathSegments[2] // /user-financial-api/user/{userId}/...
    const endpoint = pathSegments[3] // balance, transactions, etc.
    
    console.log('Extracted userId:', userId)
    console.log('Endpoint:', endpoint)

    // Validar user_id
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário existe e está ativo
    console.log('Searching for user with ID:', userId)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_status')
      .eq('id', userId)
      .maybeSingle()

    console.log('Profile query result:', { profile, profileError })
    console.log('Profile account_status:', profile?.account_status)

    if (!profile) {
      console.log('User not found in profiles table')
      return new Response(
        JSON.stringify({ 
          error: 'User not found or inactive',
          debug: { userId, profileFound: false }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.account_status !== 'active') {
      console.log('User found but not active, status:', profile.account_status)
      return new Response(
        JSON.stringify({ 
          error: 'User not found or inactive',
          debug: { userId, profileFound: true, status: profile.account_status }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    switch (endpoint) {
      case 'balance': {
        // Calcular saldo (receitas - despesas)
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', userId)

        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const balance = income - expenses

        return new Response(
          JSON.stringify({
            balance,
            total_income: income,
            total_expenses: expenses,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'transactions': {
        let requestData = { limit: 10, period: 'month' };
        
        // Se for POST, ler parâmetros do body
        if (req.method === 'POST') {
          requestData = { ...requestData, ...await req.json() };
        } else {
          // Manter compatibilidade com GET usando query params
          const limit = url.searchParams.get('limit') || '10';
          const period = url.searchParams.get('period') || 'month';
          requestData = { limit: parseInt(limit), period };
        }

        let dateFilter = {}
        if (requestData.period === 'month') {
          dateFilter = { gte: monthStart, lte: monthEnd }
        } else if (requestData.period === 'week') {
          const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          dateFilter = { gte: weekStart }
        }

        let query = supabase
          .from('transactions')
          .select(`
            id, title, description, amount, type, date, created_at,
            categories (name, color, icon)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(requestData.limit)

        if (requestData.period !== 'all') {
          query = query.gte('date', Object.values(dateFilter)[0])
          if (dateFilter.lte) {
            query = query.lte('date', dateFilter.lte)
          }
        }

        const { data: transactions } = await query

        return new Response(
          JSON.stringify({
            transactions: transactions || [],
            period: requestData.period,
            total_count: transactions?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'expenses-by-category': {
        let requestData = { period: 'month' };
        
        // Se for POST, ler parâmetros do body
        if (req.method === 'POST') {
          requestData = { ...requestData, ...await req.json() };
        } else {
          // Manter compatibilidade com GET usando query params
          const period = url.searchParams.get('period') || 'month';
          requestData = { period };
        }

        let dateFilter = {}
        if (requestData.period === 'month') {
          dateFilter = { gte: monthStart, lte: monthEnd }
        }

        const { data: expenses } = await supabase
          .from('transactions')
          .select(`
            amount, date,
            categories (name, color)
          `)
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd)

        // Agrupar por categoria
        const categoryExpenses = expenses?.reduce((acc, expense) => {
          const categoryName = expense.categories?.name || 'Sem categoria'
          if (!acc[categoryName]) {
            acc[categoryName] = {
              category: categoryName,
              color: expense.categories?.color || '#gray',
              total: 0,
              count: 0
            }
          }
          acc[categoryName].total += Number(expense.amount)
          acc[categoryName].count += 1
          return acc
        }, {} as Record<string, any>) || {}

        const totalExpenses = Object.values(categoryExpenses).reduce((sum: number, cat: any) => sum + cat.total, 0)

        return new Response(
          JSON.stringify({
            total_expenses: totalExpenses,
            by_category: Object.values(categoryExpenses),
            period: requestData.period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'expenses': {
        // GET request - usar query params se fornecidos
        const period = url.searchParams.get('period') || 'month';
        
        let dateFilter = {}
        if (period === 'month') {
          dateFilter = { gte: monthStart, lte: monthEnd }
        }

        const { data: expenses } = await supabase
          .from('transactions')
          .select('amount, date, title')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd)

        const totalExpenses = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        return new Response(
          JSON.stringify({
            total_expenses: totalExpenses,
            transactions: expenses || [],
            period: period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'income': {
        const { data: income } = await supabase
          .from('transactions')
          .select('amount, date, title')
          .eq('user_id', userId)
          .eq('type', 'income')
          .gte('date', monthStart)
          .lte('date', monthEnd)

        const totalIncome = income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        return new Response(
          JSON.stringify({
            total_income: totalIncome,
            transactions: income || [],
            period: 'month',
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'income-by-category': {
        let requestData = { period: 'month' };
        
        if (req.method === 'POST') {
          requestData = { ...requestData, ...await req.json() };
        } else {
          const period = url.searchParams.get('period') || 'month';
          requestData = { period };
        }

        const { data: income } = await supabase
          .from('transactions')
          .select(`
            amount, date,
            categories (name, color)
          `)
          .eq('user_id', userId)
          .eq('type', 'income')
          .gte('date', monthStart)
          .lte('date', monthEnd)

        // Agrupar por categoria
        const categoryIncome = income?.reduce((acc, incomeItem) => {
          const categoryName = incomeItem.categories?.name || 'Sem categoria'
          if (!acc[categoryName]) {
            acc[categoryName] = {
              category: categoryName,
              color: incomeItem.categories?.color || '#green',
              total: 0,
              count: 0
            }
          }
          acc[categoryName].total += Number(incomeItem.amount)
          acc[categoryName].count += 1
          return acc
        }, {} as Record<string, any>) || {}

        const totalIncome = Object.values(categoryIncome).reduce((sum: number, cat: any) => sum + cat.total, 0)

        return new Response(
          JSON.stringify({
            total_income: totalIncome,
            by_category: Object.values(categoryIncome),
            period: requestData.period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'goals': {
        const { data: goals } = await supabase
          .from('goals')
          .select(`
            id, title, target_amount, current_amount, target_date,
            goal_type, status, month_year,
            categories (name, color)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')

        // Para metas mensais, calcular progresso atual
        for (const goal of goals || []) {
          if (goal.goal_type === 'monthly_budget' && goal.month_year) {
            const [year, month] = goal.month_year.split('-')
            const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0]
            const monthEndDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

            const { data: monthlyExpenses } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', userId)
              .eq('type', 'expense')
              .eq('category_id', goal.category_id)
              .gte('date', monthStartDate)
              .lte('date', monthEndDate)

            const spentAmount = monthlyExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
            goal.current_amount = spentAmount
            goal.progress_percentage = goal.target_amount > 0 ? (spentAmount / goal.target_amount) * 100 : 0
            goal.is_exceeded = spentAmount > goal.target_amount
          }
        }

        return new Response(
          JSON.stringify({
            goals: goals || [],
            total_goals: goals?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'summary': {
        // Resumo completo do usuário
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', userId)

        const { data: monthlyTransactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd)

        const totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const monthlyIncome = monthlyTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const monthlyExpenses = monthlyTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0

        const { data: activeGoals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')

        return new Response(
          JSON.stringify({
            balance: totalIncome - totalExpenses,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            monthly_income: monthlyIncome,
            monthly_expenses: monthlyExpenses,
            monthly_balance: monthlyIncome - monthlyExpenses,
            active_goals: activeGoals?.length || 0,
            currency: 'BRL',
            last_updated: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Financial API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})