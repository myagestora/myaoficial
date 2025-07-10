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

    // Parse URL to extract user ID and endpoint
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // /user-analytics-api/user/{userId}/{endpoint}
    const endpoint = pathParts[pathParts.length - 1];

    if (!userId || !endpoint) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format. Expected: /user/{user_id}/{endpoint}' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =============== SPENDING TRENDS ENDPOINT ===============
    if (endpoint === 'spending-trends') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json();
      const { period = 6 } = body; // default 6 months

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - period);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!transactions || transactions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Não há dados de transações para o período solicitado',
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Group by month
      const monthlyData = transactions.reduce((acc: any, transaction: any) => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = { income: 0, expenses: 0 };
        }
        
        if (transaction.type === 'income') {
          acc[monthKey].income += Number(transaction.amount);
        } else {
          acc[monthKey].expenses += Number(transaction.amount);
        }
        
        return acc;
      }, {});

      const trends = Object.entries(monthlyData)
        .map(([month, data]: [string, any]) => ({
          month,
          ...data,
          balance: data.income - data.expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return new Response(
        JSON.stringify({
          trends,
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =============== CATEGORY BREAKDOWN ENDPOINT ===============
    if (endpoint === 'category-breakdown') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed. Use POST.' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json();
      const { period = 'month' } = body; // 'month', 'quarter', 'year'

      let startDate = new Date();
      const endDate = new Date();

      switch (period) {
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default: // month
          startDate.setMonth(endDate.getMonth() - 1);
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          amount, 
          type, 
          category_id,
          categories!inner(name, color)
        `)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!transactions || transactions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Não há dados de transações para o período solicitado',
            currency: 'BRL'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Group by category and type
      const categoryData = transactions.reduce((acc: any, transaction: any) => {
        const category = transaction.categories?.name || 'Sem categoria';
        const type = transaction.type;
        const amount = Number(transaction.amount);
        
        if (!acc[type]) acc[type] = {};
        if (!acc[type][category]) {
          acc[type][category] = {
            total: 0,
            color: transaction.categories?.color || '#3B82F6'
          };
        }
        
        acc[type][category].total += amount;
        return acc;
      }, {});

      // Calculate totals and percentages
      const incomeTotal = Object.values(categoryData.income || {}).reduce((sum: number, cat: any) => sum + cat.total, 0);
      const expenseTotal = Object.values(categoryData.expense || {}).reduce((sum: number, cat: any) => sum + cat.total, 0);

      const result = {
        income: Object.entries(categoryData.income || {}).map(([name, data]: [string, any]) => ({
          name,
          total: data.total,
          percentage: incomeTotal > 0 ? (data.total / incomeTotal) * 100 : 0,
          color: data.color
        })),
        expenses: Object.entries(categoryData.expense || {}).map(([name, data]: [string, any]) => ({
          name,
          total: data.total,
          percentage: expenseTotal > 0 ? (data.total / expenseTotal) * 100 : 0,
          color: data.color
        })),
        totals: {
          income: incomeTotal,
          expenses: expenseTotal,
          balance: incomeTotal - expenseTotal
        },
        currency: 'BRL'
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =============== MONTHLY COMPARISON ENDPOINT ===============
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
      const lastMonthNumber = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const lastMonthStart = new Date(lastMonthYear, lastMonthNumber, 1).toISOString().split('T')[0]
      const lastMonthEnd = new Date(lastMonthYear, lastMonthNumber + 1, 0).toISOString().split('T')[0]

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

      const thisMonthData = calculateTotals(thisMonthTransactions || [])
      const lastMonthData = calculateTotals(lastMonthTransactions || [])

      const incomeChange = lastMonthData.income > 0 ? ((thisMonthData.income - lastMonthData.income) / lastMonthData.income) * 100 : 0
      const expensesChange = lastMonthData.expenses > 0 ? ((thisMonthData.expenses - lastMonthData.expenses) / lastMonthData.expenses) * 100 : 0

      return new Response(
        JSON.stringify({
          current_month: {
            ...thisMonthData,
            balance: thisMonthData.income - thisMonthData.expenses,
            month_name: currentDate.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
          },
          previous_month: {
            ...lastMonthData,
            balance: lastMonthData.income - lastMonthData.expenses,
            month_name: new Date(lastMonthYear, lastMonthNumber, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
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