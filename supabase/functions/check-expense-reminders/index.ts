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

    // Get user ID from request body
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user has expense reminders enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expense_reminders_enabled, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile || !profile.expense_reminders_enabled) {
      return new Response(
        JSON.stringify({ 
          message: 'User does not have expense reminders enabled',
          notification_created: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Check if there's already a notification for today's expenses
    const { data: existingNotification } = await supabase
      .from('user_notifications_read')
      .select('*')
      .eq('user_id', user_id)
      .gte('read_at', today)
      .limit(1);

    // Fetch user's expense transactions for today
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        title,
        amount,
        categories(name, color)
      `)
      .eq('user_id', user_id)
      .eq('type', 'expense')
      .eq('date', today);

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

    // If no transactions or already notified today, return
    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No expenses found for today',
          notification_created: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if notification already exists for today's expenses
    const notificationKey = `expense_reminder_${today}_${user_id}`;
    const { data: existingSystemNotification } = await supabase
      .from('notifications')
      .select('id')
      .ilike('message', `%${today}%`)
      .eq('type', 'expense_reminder')
      .gte('created_at', today)
      .limit(1);

    if (existingSystemNotification && existingSystemNotification.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Notification already exists for today',
          notification_created: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate total amount and create expense list
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const expensesList = transactions.map((t: any) => t.title).join(', ');

    // Create notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: '💰 Despesas de Hoje',
        message: `Você tem ${transactions.length} despesa(s) para hoje (${today}): ${expensesList}. Total: R$ ${totalAmount.toFixed(2)}`,
        type: 'expense_reminder',
        created_by: user_id,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Created expense reminder for user ${user_id}: ${transactions.length} expenses, total R$ ${totalAmount.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        message: 'Expense reminder notification created successfully',
        notification_created: true,
        notification_id: notification.id,
        expenses_count: transactions.length,
        total_amount: totalAmount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in check-expense-reminders function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})