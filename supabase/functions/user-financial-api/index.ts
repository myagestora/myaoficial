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
        // Apenas POST permitido
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let requestData = { period: 'month' };
        requestData = { ...requestData, ...await req.json() };

        // Definir filtros de data baseado no período
        let query = supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', userId);

        if (requestData.period === 'month') {
          query = query.gte('date', monthStart).lte('date', monthEnd);
        } else if (requestData.period === 'week') {
          const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          query = query.gte('date', weekStart);
        } else if (requestData.period === 'year') {
          query = query.gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
        }
        // Para 'all', não adiciona filtros de data

        const { data: transactions } = await query;

        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const balance = income - expenses

        return new Response(
          JSON.stringify({
            balance,
            total_income: income,
            total_expenses: expenses,
            period: requestData.period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'transactions': {
        // Apenas POST permitido
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let requestData = { limit: 10, period: 'month' };
        requestData = { ...requestData, ...await req.json() };

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
        // Apenas POST permitido
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let requestData = { period: 'month' };
        requestData = { ...requestData, ...await req.json() };

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
        // Apenas GET permitido
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const period = url.searchParams.get('period') || 'month';
        
        let dateFilter = {}
        if (period === 'month') {
          dateFilter = { gte: monthStart, lte: monthEnd }
        }

        const { data: expenses } = await supabase
          .from('transactions')
          .select(`
            amount, 
            date, 
            title,
            categories (name)
          `)
          .eq('user_id', userId)
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd)

        // Transformar o resultado para incluir category como string
        const transformedExpenses = expenses?.map(expense => ({
          amount: expense.amount,
          date: expense.date,
          title: expense.title,
          category: expense.categories?.name || 'Sem categoria'
        })) || []

        const totalExpenses = transformedExpenses.reduce((sum, t) => sum + Number(t.amount), 0)

        return new Response(
          JSON.stringify({
            total_expenses: totalExpenses,
            transactions: transformedExpenses,
            period: period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'income': {
        // Apenas GET permitido
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const period = url.searchParams.get('period') || 'month';
        
        let dateFilter = {}
        if (period === 'month') {
          dateFilter = { gte: monthStart, lte: monthEnd }
        } else if (period === 'week') {
          const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          dateFilter = { gte: weekStart }
        }

        let query = supabase
          .from('transactions')
          .select('amount, date, title')
          .eq('user_id', userId)
          .eq('type', 'income')

        if (period !== 'all') {
          query = query.gte('date', Object.values(dateFilter)[0] as string)
          if (dateFilter.lte) {
            query = query.lte('date', dateFilter.lte)
          }
        }

        const { data: income } = await query

        const totalIncome = income?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        return new Response(
          JSON.stringify({
            total_income: totalIncome,
            transactions: income || [],
            period: period,
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'income-by-category': {
        // Apenas POST permitido
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let requestData = { period: 'month' };
        requestData = { ...requestData, ...await req.json() };

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
        // Aceita GET e POST
        if (req.method !== 'GET' && req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let period = null;
        let goal_type = null;

        if (req.method === 'POST') {
          const requestData = await req.json();
          period = requestData.period;
          goal_type = requestData.goal_type;
        } else {
          period = url.searchParams.get('period');
          goal_type = url.searchParams.get('goal_type');
        }

        let query = supabase
          .from('goals')
          .select(`
            id, title, target_amount, current_amount, target_date,
            goal_type, status, month_year, category_id,
            categories (name, color)
          `)
          .eq('user_id', userId)
          .eq('status', 'active');

        // Filtrar por tipo de meta se especificado
        if (goal_type) {
          query = query.eq('goal_type', goal_type);
        }

        // Filtrar por período se especificado
        if (period) {
          if (period === 'month') {
            const currentMonthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            query = query.eq('month_year', currentMonthYear);
          } else if (period === 'year') {
            query = query.like('month_year', `${currentYear}-%`);
          }
          // Para savings goals, filtrar por target_date se necessário
          if (goal_type === 'savings' && period !== 'all') {
            if (period === 'month') {
              query = query.gte('target_date', monthStart).lte('target_date', monthEnd);
            } else if (period === 'year') {
              query = query.gte('target_date', `${currentYear}-01-01`).lte('target_date', `${currentYear}-12-31`);
            }
          }
        }

        const { data: goals } = await query;

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
        // Apenas GET permitido
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const period = url.searchParams.get('period') || 'month';
        
        // Definir filtros de data baseado no período
        let periodStart, periodEnd;
        if (period === 'month') {
          periodStart = monthStart;
          periodEnd = monthEnd;
        } else if (period === 'week') {
          // Calcular início e fim da semana atual (domingo a sábado)
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = domingo, 6 = sábado
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - dayOfWeek);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          periodStart = weekStart.toISOString().split('T')[0];
          periodEnd = weekEnd.toISOString().split('T')[0];
        } else if (period === 'year') {
          periodStart = `${currentYear}-01-01`;
          periodEnd = `${currentYear}-12-31`;
        } else if (period === 'all') {
          // Sem filtro de data para 'all'
          periodStart = null;
          periodEnd = null;
        } else {
          // Período inválido, usar mês como padrão
          periodStart = monthStart;
          periodEnd = monthEnd;
        }
        
        // Resumo completo do usuário (sempre todos os dados)
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', userId)

        // Transações do período específico
        let periodQuery = supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', userId);
          
        if (periodStart && periodEnd) {
          periodQuery = periodQuery.gte('date', periodStart).lte('date', periodEnd);
        }
        
        const { data: periodTransactions } = await periodQuery;

        const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const totalExpenses = allTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const periodIncome = periodTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const periodExpenses = periodTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0

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
            period_income: periodIncome,
            period_expenses: periodExpenses,
            period_balance: periodIncome - periodExpenses,
            period: period,
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