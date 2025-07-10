import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
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
      .select('created_by, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('key', apiKey);

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const userId = pathSegments[2] // /user-analytics-api/user/{userId}/...
    const endpoint = pathSegments[3] // spending-trends, category-breakdown, etc.

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('account_status', 'active')
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'spending-trends') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let requestData = { months: 6 };
      try {
        const body = await req.json();
        if (body && typeof body === 'object') {
          requestData = { ...requestData, ...body };
        }
      } catch (e) {
        // Use defaults if no valid body
      }
      
      // Query transactions for the specified period
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - requestData.months)
      const startDateStr = startDate.toISOString().split('T')[0]

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .order('date')

      if (transError) {
        return new Response(
          JSON.stringify({ error: 'Database error', details: transError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!transactions || transactions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Não há dados de transações para o período solicitado',
            trends: [],
            period_months: requestData.months,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Group by month
      const monthlyData = transactions.reduce((acc, transaction) => {
        const monthKey = transaction.date.substring(0, 7) // YYYY-MM
        if (!acc[monthKey]) {
          acc[monthKey] = { income: 0, expenses: 0, month: monthKey }
        }
        
        if (transaction.type === 'income') {
          acc[monthKey].income += Number(transaction.amount)
        } else {
          acc[monthKey].expenses += Number(transaction.amount)
        }
        
        return acc
      }, {} as Record<string, any>)

      const trends = Object.values(monthlyData).map((month: any) => ({
        ...month,
        balance: month.income - month.expenses,
        month_name: new Date(month.month + '-01').toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: 'long' 
        })
      }))

      return new Response(
        JSON.stringify({
          trends,
          period_months: requestData.months,
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'category-breakdown') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let requestData = { period: 'month' };
      try {
        const body = await req.json();
        if (body && typeof body === 'object') {
          requestData = { ...requestData, ...body };
        }
      } catch (e) {
        // Use defaults
      }
      
      const currentDate = new Date()
      let startDate: string
      
      if (requestData.period === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
      } else if (requestData.period === 'quarter') {
        const quarter = Math.floor(currentDate.getMonth() / 3)
        startDate = new Date(currentDate.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
      } else {
        startDate = new Date(currentDate.getFullYear(), 0, 1).toISOString().split('T')[0]
      }

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          amount, type,
          categories (name, color, icon)
        `)
        .eq('user_id', userId)
        .gte('date', startDate)

      if (transError) {
        return new Response(
          JSON.stringify({ error: 'Database error', details: transError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!transactions || transactions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Não há dados de transações para o período solicitado',
            income: { total: 0, by_category: [] },
            expenses: { total: 0, by_category: [] },
            period: requestData.period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Process income and expenses by category
      const incomeByCategory = transactions.filter(t => t.type === 'income').reduce((acc, t) => {
        const categoryName = t.categories?.name || 'Sem categoria'
        if (!acc[categoryName]) {
          acc[categoryName] = {
            category: categoryName,
            color: t.categories?.color || '#gray',
            icon: t.categories?.icon || 'folder',
            total: 0,
            percentage: 0
          }
        }
        acc[categoryName].total += Number(t.amount)
        return acc
      }, {} as Record<string, any>)

      const expensesByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
        const categoryName = t.categories?.name || 'Sem categoria'
        if (!acc[categoryName]) {
          acc[categoryName] = {
            category: categoryName,
            color: t.categories?.color || '#gray',
            icon: t.categories?.icon || 'folder',
            total: 0,
            percentage: 0
          }
        }
        acc[categoryName].total += Number(t.amount)
        return acc
      }, {} as Record<string, any>)

      // Calculate percentages
      const totalIncome = Object.values(incomeByCategory).reduce((sum: number, cat: any) => sum + cat.total, 0)
      const totalExpenses = Object.values(expensesByCategory).reduce((sum: number, cat: any) => sum + cat.total, 0)

      Object.values(incomeByCategory).forEach((cat: any) => {
        cat.percentage = totalIncome > 0 ? (cat.total / totalIncome) * 100 : 0
      })

      Object.values(expensesByCategory).forEach((cat: any) => {
        cat.percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
      })

      return new Response(
        JSON.stringify({
          income: {
            total: totalIncome,
            by_category: Object.values(incomeByCategory)
          },
          expenses: {
            total: totalExpenses,
            by_category: Object.values(expensesByCategory)
          },
          period: requestData.period,
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'monthly-comparison') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      // Current month
      const thisMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // Previous month
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const lastMonthStart = new Date(lastMonthYear, lastMonth, 1).toISOString().split('T')[0]
      const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0).toISOString().split('T')[0]

      // Get current month transactions
      const { data: thisMonthTransactions, error: thisMonthError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .gte('date', thisMonthStart)
        .lte('date', thisMonthEnd)

      // Get previous month transactions
      const { data: lastMonthTransactions, error: lastMonthError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd)

      if (thisMonthError || lastMonthError) {
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if we have enough data for comparison
      if ((!thisMonthTransactions || thisMonthTransactions.length === 0) && 
          (!lastMonthTransactions || lastMonthTransactions.length === 0)) {
        return new Response(
          JSON.stringify({ 
            message: 'Não há dados suficientes para comparação mensal',
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const calculateTotals = (transactions: any[]) => {
        return transactions?.reduce((acc, t) => {
          if (t.type === 'income') {
            acc.income += Number(t.amount)
          } else {
            acc.expenses += Number(t.amount)
          }
          return acc
        }, { income: 0, expenses: 0 }) || { income: 0, expenses: 0 }
      }

      const thisMonth = calculateTotals(thisMonthTransactions || [])
      const lastMonth = calculateTotals(lastMonthTransactions || [])

      const incomeChange = lastMonth.income > 0 ? ((thisMonth.income - lastMonth.income) / lastMonth.income) * 100 : 0
      const expensesChange = lastMonth.expenses > 0 ? ((thisMonth.expenses - lastMonth.expenses) / lastMonth.expenses) * 100 : 0

      return new Response(
        JSON.stringify({
          current_month: {
            ...thisMonth,
            balance: thisMonth.income - thisMonth.expenses,
            month_name: currentDate.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
          },
          previous_month: {
            ...lastMonth,
            balance: lastMonth.income - lastMonth.expenses,
            month_name: new Date(lastMonthYear, lastMonth, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
          },
          comparison: {
            income_change: incomeChange,
            expenses_change: expensesChange,
            income_trend: incomeChange > 0 ? 'up' : incomeChange < 0 ? 'down' : 'stable',
            expenses_trend: expensesChange > 0 ? 'up' : expensesChange < 0 ? 'down' : 'stable'
          },
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Analytics endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})