import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to check if period is a specific date
const isSpecificDate = (period: string) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(period);
};

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
    
    // Check for global endpoints first
    if (pathSegments[1] === 'expense-reminders') {
      // Global endpoint for expense reminders
      const today = new Date().toISOString().split('T')[0];

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          user_id,
          categories!inner(name, color),
          profiles!inner(id, full_name, email, expense_reminders_enabled)
        `)
        .eq('type', 'expense')
        .eq('date', today)
        .eq('profiles.expense_reminders_enabled', true);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch transactions' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Group transactions by user
      const userGroups = new Map();

      transactions?.forEach((transaction: any) => {
        const userId = transaction.user_id;
        const profile = transaction.profiles;
        
        if (!userGroups.has(userId)) {
          userGroups.set(userId, {
            user_id: userId,
            user_name: profile.full_name || 'Usuário',
            user_email: profile.email,
            reminders_enabled: profile.expense_reminders_enabled,
            expenses_today: [],
            total_expenses: 0,
            expenses_count: 0
          });
        }

        const userGroup = userGroups.get(userId);
        userGroup.expenses_today.push({
          id: transaction.id,
          title: transaction.title,
          amount: transaction.amount,
          category: transaction.categories?.name || 'Sem categoria',
          category_color: transaction.categories?.color || '#3B82F6',
          date: transaction.date
        });
        
        userGroup.total_expenses += transaction.amount;
        userGroup.expenses_count += 1;
      });

      const usersWithExpenses = Array.from(userGroups.values());
      const totalAmount = usersWithExpenses.reduce((sum, user) => sum + user.total_expenses, 0);

      const response = {
        date: today,
        users_with_expenses: usersWithExpenses,
        total_users: usersWithExpenses.length,
        total_amount: totalAmount,
        message: usersWithExpenses.length > 0 
          ? `${usersWithExpenses.length} usuário(s) com despesas hoje`
          : 'Nenhum usuário com despesas hoje'
      };

      console.log(`Expense reminders check: ${usersWithExpenses.length} users with expenses on ${today}`);

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
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

    // Helper function to get date range for period
    const getPeriodDateRange = (period: string | null) => {
      if (!period || period === 'all') {
        console.log('No period or all - returning null');
        return null;
      }
      
      console.log('Processing period:', period);
      
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      
      // Handle specific date (yyyy-MM-dd)
      if (isSpecificDate(period)) {
        console.log('Specific date detected:', period);
        return { start: period, end: period }
      }
      
      // Handle standard periods
      if (period === 'month') {
        const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
        const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
        console.log('Month period:', { start: monthStart, end: monthEnd });
        return { start: monthStart, end: monthEnd }
      }
      
      if (period === 'week') {
        const weekStart = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const weekEnd = currentDate.toISOString().split('T')[0]
        console.log('Week period:', { start: weekStart, end: weekEnd });
        return { start: weekStart, end: weekEnd }
      }
      
      if (period === 'year') {
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        console.log('Year period:', { start: yearStart, end: yearEnd });
        return { start: yearStart, end: yearEnd }
      }
      
      if (period === 'quarter') {
        const quarterNumber = Math.floor((currentMonth - 1) / 3) + 1;
        const quarterStart = new Date(currentYear, (quarterNumber - 1) * 3, 1).toISOString().split('T')[0];
        const quarterEnd = new Date(currentYear, quarterNumber * 3, 0).toISOString().split('T')[0];
        console.log('Quarter period:', { start: quarterStart, end: quarterEnd });
        return { start: quarterStart, end: quarterEnd };
      }
      
      console.log('Unknown period, returning null:', period);
      return null;
    }

    switch (endpoint) {
      case 'balance': {
        try {
          if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          let requestData = { period: null };
          try {
            const body = await req.json();
            if (body && body.period) {
              requestData.period = body.period;
            }
            console.log('Balance endpoint request data:', requestData);
          } catch (e) {
            console.log('No request body, using defaults:', requestData);
          }

          let query = supabase
            .from('transactions')
            .select('amount, type, date')
            .eq('user_id', userId);

          const dateRange = getPeriodDateRange(requestData.period);
          console.log('Date range for balance:', dateRange);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: transactions, error: transactionError } = await query;
          
          if (transactionError) {
            console.error('Balance endpoint transaction error:', transactionError);
            throw transactionError;
          }

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
        } catch (error) {
          console.error('Balance endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in balance endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'transactions': {
        try {
          if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          let requestData = { limit: 10, period: 'month' };
          try {
            requestData = { ...requestData, ...await req.json() };
          } catch (e) {
            console.log('No request body, using defaults');
          }

          // First, get transactions without JOIN
          let query = supabase
            .from('transactions')
            .select('id, title, description, amount, type, date, created_at, category_id')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(requestData.limit);

          const dateRange = getPeriodDateRange(requestData.period);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: transactions, error: transactionError } = await query;
          
          if (transactionError) {
            console.error('Transactions endpoint error:', transactionError);
            throw transactionError;
          }

          // Get categories separately
          const categoryIds = [...new Set(transactions?.map(t => t.category_id).filter(Boolean))];
          let categoriesMap = {};
          
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('categories')
              .select('id, name, color, icon')
              .in('id', categoryIds);
            
            categoriesMap = categories?.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {}) || {};
          }

          // Map categories to transactions
          const enrichedTransactions = transactions?.map(transaction => ({
            ...transaction,
            categories: transaction.category_id ? categoriesMap[transaction.category_id] : null
          })) || [];

          return new Response(
            JSON.stringify({
              transactions: enrichedTransactions,
              period: requestData.period,
              total_count: enrichedTransactions.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Transactions endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in transactions endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'expenses-by-category': {
        try {
          if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          let requestData = { period: null };
          try {
            const body = await req.json();
            if (body && body.period) {
              requestData.period = body.period;
            }
            console.log('Expenses by category request data:', requestData);
          } catch (e) {
            console.log('No request body, using defaults');
          }

          // Get expenses without JOIN
          let query = supabase
            .from('transactions')
            .select('amount, date, category_id')
            .eq('user_id', userId)
            .eq('type', 'expense');

          const dateRange = getPeriodDateRange(requestData.period);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: expenses, error: expenseError } = await query;
          
          if (expenseError) {
            console.error('Expenses by category error:', expenseError);
            throw expenseError;
          }

          // Get categories separately
          const categoryIds = [...new Set(expenses?.map(e => e.category_id).filter(Boolean))];
          let categoriesMap = {};
          
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('categories')
              .select('id, name, color')
              .in('id', categoryIds);
            
            categoriesMap = categories?.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {}) || {};
          }

          const categoryExpenses = expenses?.reduce((acc, expense) => {
            const category = expense.category_id ? categoriesMap[expense.category_id] : null;
            const categoryName = category?.name || 'Sem categoria';
            
            if (!acc[categoryName]) {
              acc[categoryName] = {
                category: categoryName,
                color: category?.color || '#6B7280',
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
        } catch (error) {
          console.error('Expenses by category endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in expenses by category endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'expenses': {
        try {
          if (req.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const period = url.searchParams.get('period');
          console.log('Expenses endpoint period:', period);
          
          // Get expenses without JOIN
          let query = supabase
            .from('transactions')
            .select('amount, date, title, category_id')
            .eq('user_id', userId)
            .eq('type', 'expense');

          const dateRange = getPeriodDateRange(period);
          console.log('Expenses date range:', dateRange);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: expenses, error: expenseError } = await query;
          
          if (expenseError) {
            console.error('Expenses endpoint error:', expenseError);
            throw expenseError;
          }

          // Get categories separately
          const categoryIds = [...new Set(expenses?.map(e => e.category_id).filter(Boolean))];
          let categoriesMap = {};
          
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('categories')
              .select('id, name')
              .in('id', categoryIds);
            
            categoriesMap = categories?.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {}) || {};
          }

          const transformedExpenses = expenses?.map(expense => ({
            amount: expense.amount,
            date: expense.date,
            title: expense.title,
            category: expense.category_id ? categoriesMap[expense.category_id]?.name || 'Sem categoria' : 'Sem categoria'
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
        } catch (error) {
          console.error('Expenses endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in expenses endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'income': {
        try {
          if (req.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const period = url.searchParams.get('period');
          console.log('Income endpoint period:', period);
          
          let query = supabase
            .from('transactions')
            .select('amount, date, title')
            .eq('user_id', userId)
            .eq('type', 'income');

          const dateRange = getPeriodDateRange(period);
          console.log('Income date range:', dateRange);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: income, error: incomeError } = await query;
          
          if (incomeError) {
            console.error('Income endpoint error:', incomeError);
            throw incomeError;
          }

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
        } catch (error) {
          console.error('Income endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in income endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'income-by-category': {
        try {
          if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          let requestData = { period: null };
          try {
            const body = await req.json();
            if (body && body.period) {
              requestData.period = body.period;
            }
            console.log('Income by category request data:', requestData);
          } catch (e) {
            console.log('No request body, using defaults');
          }

          // Get income without JOIN
          let query = supabase
            .from('transactions')
            .select('amount, date, category_id')
            .eq('user_id', userId)
            .eq('type', 'income');

          const dateRange = getPeriodDateRange(requestData.period);
          if (dateRange) {
            query = query.gte('date', dateRange.start).lte('date', dateRange.end);
          }

          const { data: income, error: incomeError } = await query;
          
          if (incomeError) {
            console.error('Income by category error:', incomeError);
            throw incomeError;
          }

          // Get categories separately
          const categoryIds = [...new Set(income?.map(i => i.category_id).filter(Boolean))];
          let categoriesMap = {};
          
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('categories')
              .select('id, name, color')
              .in('id', categoryIds);
            
            categoriesMap = categories?.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {}) || {};
          }

          const categoryIncome = income?.reduce((acc, incomeItem) => {
            const category = incomeItem.category_id ? categoriesMap[incomeItem.category_id] : null;
            const categoryName = category?.name || 'Sem categoria';
            
            if (!acc[categoryName]) {
              acc[categoryName] = {
                category: categoryName,
                color: category?.color || '#10B981',
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
        } catch (error) {
          console.error('Income by category endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in income by category endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'goals': {
        try {
          if (req.method !== 'GET' && req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          let period = null;
          let goal_type = null;

          if (req.method === 'POST') {
            try {
              const requestData = await req.json();
              period = requestData.period;
              goal_type = requestData.goal_type;
            } catch (e) {
              console.error('Error parsing POST data:', e);
            }
          } else {
            period = url.searchParams.get('period');
            goal_type = url.searchParams.get('goal_type');
          }

          let query = supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

          if (goal_type) {
            query = query.eq('goal_type', goal_type);
          }

          if (period && period !== 'all') {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            
            if (isSpecificDate(period)) {
              if (goal_type === 'savings') {
                query = query.eq('target_date', period);
              } else if (goal_type === 'monthly_budget') {
                const specificDate = new Date(period);
                const monthYear = `${specificDate.getFullYear()}-${String(specificDate.getMonth() + 1).padStart(2, '0')}`;
                query = query.eq('month_year', monthYear);
              }
            } else if (period === 'month') {
              const currentMonthYear = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
              if (goal_type === 'monthly_budget') {
                query = query.eq('month_year', currentMonthYear);
              } else if (goal_type === 'savings') {
                const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
                const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
                query = query.gte('target_date', monthStart).lte('target_date', monthEnd);
              }
            } else if (period === 'year') {
              if (goal_type === 'monthly_budget') {
                query = query.like('month_year', `${currentYear}-%`);
              } else if (goal_type === 'savings') {
                query = query.gte('target_date', `${currentYear}-01-01`).lte('target_date', `${currentYear}-12-31`);
              }
            } else if (period.match(/^\d{4}-\d{2}$/)) {
              query = query.eq('month_year', period);
            }
          }

          const { data: goals, error: goalsError } = await query;
          
          if (goalsError) {
            throw goalsError;
          }

          const categoryIds = [...new Set(goals?.map(g => g.category_id).filter(Boolean))];
          let categoriesMap = {};
          
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('categories')
              .select('id, name, color')
              .in('id', categoryIds);
            
            categoriesMap = categories?.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {}) || {};
          }

          if (goals) {
            for (const goal of goals) {
              if (goal.category_id && categoriesMap[goal.category_id]) {
                goal.category = categoriesMap[goal.category_id];
              }
              
              if (goal.goal_type === 'monthly_budget' && goal.month_year) {
                try {
                  const [year, month] = goal.month_year.split('-');
                  const monthStartDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
                  const monthEndDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

                  const { data: monthlyExpenses } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                    .eq('category_id', goal.category_id)
                    .gte('date', monthStartDate)
                    .lte('date', monthEndDate);

                  const spentAmount = monthlyExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
                  goal.current_amount = spentAmount;
                  goal.progress_percentage = goal.target_amount > 0 ? (spentAmount / goal.target_amount) * 100 : 0;
                  goal.is_exceeded = spentAmount > goal.target_amount;
                } catch (e) {
                  goal.current_amount = 0;
                  goal.progress_percentage = 0;
                  goal.is_exceeded = false;
                }
              }
            }
          }

          return new Response(
            JSON.stringify({
              goals: goals || [],
              total_goals: goals?.length || 0
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Goals endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error', 
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'summary': {
        try {
          if (req.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed. Use GET.' }), {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const period = url.searchParams.get('period');
          console.log('Summary endpoint period:', period);
          
          // Get all transactions
          const { data: allTransactions, error: allTransError } = await supabase
            .from('transactions')
            .select('amount, type, date')
            .eq('user_id', userId);
            
          if (allTransError) {
            console.error('Summary all transactions error:', allTransError);
            throw allTransError;
          }

          // Get period transactions
          let periodQuery = supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', userId);
            
          const dateRange = getPeriodDateRange(period);
          console.log('Summary date range:', dateRange);
          if (dateRange) {
            periodQuery = periodQuery.gte('date', dateRange.start).lte('date', dateRange.end);
          }
          
          const { data: periodTransactions, error: periodTransError } = await periodQuery;
          
          if (periodTransError) {
            console.error('Summary period transactions error:', periodTransError);
            throw periodTransError;
          }

          const totalIncome = allTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
          const totalExpenses = allTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
          const periodIncome = periodTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
          const periodExpenses = periodTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0

          // Get active goals
          const { data: activeGoals, error: goalsError } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active');
            
          if (goalsError) {
            console.error('Summary goals error:', goalsError);
            // Don't throw here, just log and continue with 0 goals
          }

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
        } catch (error) {
          console.error('Summary endpoint error:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Internal server error in summary endpoint',
              details: error.message 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
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