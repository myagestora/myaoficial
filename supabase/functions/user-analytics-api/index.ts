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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const userId = pathSegments[1]
    const endpoint = pathSegments[2]

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário existe
    const { data: profile } = await supabase
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

    switch (endpoint) {
      case 'spending-trends': {
        let requestData = { months: 6 };
        
        // Se for POST, ler parâmetros do body
        if (req.method === 'POST') {
          requestData = { ...requestData, ...await req.json() };
        } else {
          // Manter compatibilidade com GET usando query params
          const months = parseInt(url.searchParams.get('months') || '6');
          requestData = { months };
        }
        
        // Buscar transações dos últimos X meses
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - requestData.months)
        const startDateStr = startDate.toISOString().split('T')[0]

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', userId)
          .gte('date', startDateStr)
          .order('date')

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

      case 'category-breakdown': {
        let requestData = { period: 'month' };
        
        // Se for POST, ler parâmetros do body
        if (req.method === 'POST') {
          requestData = { ...requestData, ...await req.json() };
        } else {
          // Manter compatibilidade com GET usando query params
          const period = url.searchParams.get('period') || 'month';
          requestData = { period };
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

        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            amount, type,
            categories (name, color, icon)
          `)
          .eq('user_id', userId)
          .gte('date', startDate)

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

      case 'monthly-comparison': {
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

        // Buscar dados do mês atual
        const { data: thisMonthTransactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', userId)
          .gte('date', thisMonthStart)
          .lte('date', thisMonthEnd)

        // Buscar dados do mês anterior
        const { data: lastMonthTransactions } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', userId)
          .gte('date', lastMonthStart)
          .lte('date', lastMonthEnd)

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

      default:
        return new Response(
          JSON.stringify({ error: 'Analytics endpoint not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})