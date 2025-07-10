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

    let requestData = { user_id: '' };
    
    // Se for POST, ler parâmetros do body
    if (req.method === 'POST') {
      requestData = await req.json();
    } else {
      // Manter compatibilidade com GET usando query params
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      requestData.user_id = userId;
    }

    if (!requestData.user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', requestData.user_id)
      .eq('account_status', 'active')
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const alerts = []
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    // Verificar metas ultrapassadas
    const { data: goals } = await supabase
      .from('goals')
      .select(`
        id, title, target_amount, goal_type, month_year,
        categories (name, color)
      `)
      .eq('user_id', requestData.user_id)
      .eq('status', 'active')

    for (const goal of goals || []) {
      if (goal.goal_type === 'monthly_budget' && goal.month_year) {
        const [year, month] = goal.month_year.split('-')
        
        // Verificar se é o mês atual
        if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
          const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0]
          const monthEndDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

          const { data: expenses } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', requestData.user_id)
            .eq('type', 'expense')
            .eq('category_id', goal.category_id)
            .gte('date', monthStartDate)
            .lte('date', monthEndDate)

          const spentAmount = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
          const targetAmount = Number(goal.target_amount)
          const percentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0

          if (spentAmount > targetAmount) {
            alerts.push({
              type: 'goal_exceeded',
              severity: 'high',
              title: 'Meta Ultrapassada',
              message: `Você ultrapassou sua meta de ${goal.categories?.name || 'categoria'} em R$ ${(spentAmount - targetAmount).toFixed(2)}`,
              details: {
                goal_title: goal.title,
                category: goal.categories?.name,
                target_amount: targetAmount,
                spent_amount: spentAmount,
                exceeded_amount: spentAmount - targetAmount,
                percentage: percentage.toFixed(1)
              }
            })
          } else if (percentage >= 80) {
            alerts.push({
              type: 'goal_warning',
              severity: 'medium',
              title: 'Meta Próxima do Limite',
              message: `Você já gastou ${percentage.toFixed(1)}% da sua meta de ${goal.categories?.name || 'categoria'}`,
              details: {
                goal_title: goal.title,
                category: goal.categories?.name,
                target_amount: targetAmount,
                spent_amount: spentAmount,
                remaining_amount: targetAmount - spentAmount,
                percentage: percentage.toFixed(1)
              }
            })
          }
        }
      }
    }

    // Verificar gastos altos no mês
    const { data: monthlyExpenses } = await supabase
      .from('transactions')
      .select(`
        amount, date,
        categories (name)
      `)
      .eq('user_id', requestData.user_id)
      .eq('type', 'expense')
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const totalMonthlyExpenses = monthlyExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

    // Comparar com mês anterior
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const lastMonthStart = new Date(lastMonthYear, lastMonth - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0).toISOString().split('T')[0]

    const { data: lastMonthExpenses } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', requestData.user_id)
      .eq('type', 'expense')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)

    const totalLastMonthExpenses = lastMonthExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

    if (totalLastMonthExpenses > 0) {
      const increasePercentage = ((totalMonthlyExpenses - totalLastMonthExpenses) / totalLastMonthExpenses) * 100
      
      if (increasePercentage > 20) {
        alerts.push({
          type: 'spending_increase',
          severity: 'medium',
          title: 'Aumento nos Gastos',
          message: `Seus gastos aumentaram ${increasePercentage.toFixed(1)}% comparado ao mês passado`,
          details: {
            current_month_expenses: totalMonthlyExpenses,
            last_month_expenses: totalLastMonthExpenses,
            increase_amount: totalMonthlyExpenses - totalLastMonthExpenses,
            increase_percentage: increasePercentage.toFixed(1)
          }
        })
      }
    }

    // Verificar saldo negativo
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', requestData.user_id)

    const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const totalExpenses = allTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const balance = totalIncome - totalExpenses

    if (balance < 0) {
      alerts.push({
        type: 'negative_balance',
        severity: 'high',
        title: 'Saldo Negativo',
        message: `Seu saldo está negativo em R$ ${Math.abs(balance).toFixed(2)}`,
        details: {
          balance,
          total_income: totalIncome,
          total_expenses: totalExpenses
        }
      })
    }

    // Verificar transações grandes recentes (últimos 7 dias)
    const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        amount, title, date, type,
        categories (name)
      `)
      .eq('user_id', requestData.user_id)
      .gte('date', weekAgo)
      .order('amount', { ascending: false })

    // Definir limite para transação "grande" baseado no histórico do usuário
    const averageTransaction = allTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) / (allTransactions?.length || 1) || 0
    const largeTransactionThreshold = averageTransaction * 3

    const largeRecentTransactions = recentTransactions?.filter(t => Number(t.amount) > largeTransactionThreshold) || []

    if (largeRecentTransactions.length > 0) {
      largeRecentTransactions.forEach(transaction => {
        alerts.push({
          type: 'large_transaction',
          severity: 'low',
          title: 'Transação Grande Detectada',
          message: `${transaction.type === 'income' ? 'Receita' : 'Despesa'} de R$ ${Number(transaction.amount).toFixed(2)} - ${transaction.title}`,
          details: {
            transaction_title: transaction.title,
            amount: Number(transaction.amount),
            type: transaction.type,
            category: transaction.categories?.name,
            date: transaction.date
          }
        })
      })
    }

    console.log(`Generated ${alerts.length} alerts for user ${requestData.user_id}`)

    return new Response(
      JSON.stringify({
        alerts,
        total_alerts: alerts.length,
        user_name: profile.full_name,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Alerts API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})