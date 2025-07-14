import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify API key
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Fetch all expense transactions for today with user profiles
    // Only include transactions that were created before today (scheduled transactions)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        title,
        amount,
        date,
        user_id,
        created_at,
        categories!inner(name, color),
        profiles!inner(id, full_name, email, expense_reminders_enabled)
      `)
      .eq('type', 'expense')
      .eq('date', today)
      .lt('created_at', today + 'T00:00:00.000Z')
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

  } catch (error) {
    console.error('Error in expense-reminders function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})