import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Function called:', req.method, req.url)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing')
    console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing')
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate API key from Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header')
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    console.log('API Key extracted:', apiKey.substring(0, 10) + '...')
    
    // Validate API key exists and is active
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    console.log('Key validation result:', { keyData: !!keyData, keyError: !!keyError })

    if (keyError || !keyData) {
      console.log('Invalid API key:', keyError?.message || 'Key not found');
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
    console.log('Path segments:', pathSegments)
    
    const userId = pathSegments[2] // /user-analytics-api/user/{userId}/...
    const endpoint = pathSegments[3] // spending-trends, category-breakdown, etc.

    console.log('User ID:', userId)
    console.log('Endpoint:', endpoint)

    if (!userId) {
      console.log('Missing user ID')
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('account_status', 'active')
      .single()

    console.log('Profile lookup:', { profile: !!profile, profileError: profileError?.message })

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing endpoint:', endpoint)

    if (endpoint === 'spending-trends') {
      console.log('Processing spending-trends endpoint')
      
      // Permitir apenas método POST
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let requestData = { months: 6 };
      
      try {
        const body = await req.json();
        console.log('Request body:', body)
        if (body && typeof body === 'object') {
          requestData = { ...requestData, ...body };
        }
      } catch (e) {
        console.log('Error parsing JSON body, using defaults:', e.message);
      }
      
      console.log('Request data:', requestData)
      
      // Buscar transações dos últimos X meses
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - requestData.months)
      const startDateStr = startDate.toISOString().split('T')[0]

      console.log('Querying transactions from:', startDateStr)

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .order('date')

      console.log('Transactions query result:', { count: transactions?.length || 0, error: transError?.message })

      if (transError) {
        console.log('Transaction query error:', transError.message)
        return new Response(
          JSON.stringify({ error: 'Database error', details: transError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Agrupar por mês
      const monthlyData = transactions?.reduce((acc, transaction) => {
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
      }, {} as Record<string, any>) || {}

      console.log('Monthly data processed:', Object.keys(monthlyData).length, 'months')

      const trends = Object.values(monthlyData).map((month: any) => ({
        ...month,
        balance: month.income - month.expenses,
        month_name: new Date(month.month + '-01').toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: 'long' 
        })
      }))

      const result = {
        trends,
        period_months: requestData.months,
        currency: 'BRL'
      }

      console.log('Returning result with', trends.length, 'trend items')

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'category-breakdown') {
      console.log('Processing category-breakdown endpoint')
      
      // Permitir apenas método POST
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let requestData = { period: 'month' };
      
      try {
        const body = await req.json();
        console.log('Request body:', body)
        if (body && typeof body === 'object') {
          requestData = { ...requestData, ...body };
        }
      } catch (e) {
        console.log('Error parsing JSON body, using defaults:', e.message);
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

      console.log('Querying transactions from:', startDate)

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          amount, type,
          categories (name, color, icon)
        `)
        .eq('user_id', userId)
        .gte('date', startDate)

      console.log('Transactions query result:', { count: transactions?.length || 0, error: transError?.message })

      if (transError) {
        console.log('Transaction query error:', transError.message)
        return new Response(
          JSON.stringify({ error: 'Database error', details: transError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Separar por tipo e categoria
      const incomeByCategory = transactions?.filter(t => t.type === 'income').reduce((acc, t) => {
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
      }, {} as Record<string, any>) || {}

      const expensesByCategory = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => {
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
      }, {} as Record<string, any>) || {}

      // Calcular percentuais
      const totalIncome = Object.values(incomeByCategory).reduce((sum: number, cat: any) => sum + cat.total, 0)
      const totalExpenses = Object.values(expensesByCategory).reduce((sum: number, cat: any) => sum + cat.total, 0)

      Object.values(incomeByCategory).forEach((cat: any) => {
        cat.percentage = totalIncome > 0 ? (cat.total / totalIncome) * 100 : 0
      })

      Object.values(expensesByCategory).forEach((cat: any) => {
        cat.percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
      })

      const result = {
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
      }

      console.log('Returning category breakdown result')

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'monthly-comparison') {
      console.log('Processing monthly-comparison endpoint')
      
      // Permitir apenas método POST
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      // Mês atual
      const thisMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // Mês anterior
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const lastMonthStart = new Date(lastMonthYear, lastMonth, 1).toISOString().split('T')[0]
      const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0).toISOString().split('T')[0]

      console.log('This month range:', thisMonthStart, 'to', thisMonthEnd)
      console.log('Last month range:', lastMonthStart, 'to', lastMonthEnd)

      // Buscar dados do mês atual
      const { data: thisMonthTransactions, error: thisMonthError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .gte('date', thisMonthStart)
        .lte('date', thisMonthEnd)

      // Buscar dados do mês anterior
      const { data: lastMonthTransactions, error: lastMonthError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd)

      console.log('This month transactions:', thisMonthTransactions?.length || 0)
      console.log('Last month transactions:', lastMonthTransactions?.length || 0)

      if (thisMonthError || lastMonthError) {
        console.log('Transaction query errors:', thisMonthError?.message, lastMonthError?.message)
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      const result = {
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
      }

      console.log('Returning monthly comparison result')

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Endpoint not found:', endpoint)
    return new Response(
      JSON.stringify({ error: 'Analytics endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})