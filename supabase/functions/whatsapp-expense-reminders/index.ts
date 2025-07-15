import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate API key
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id)

    // Get date parameter from request
    let targetDate = new Date().toISOString().split('T')[0] // Today by default
    
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body.date) {
          targetDate = body.date
        }
      } catch (error) {
        console.log('No valid JSON body provided, using default date')
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url)
      const dateParam = url.searchParams.get('date')
      if (dateParam) {
        targetDate = dateParam
      }
    }

    console.log(`Fetching WhatsApp expense reminders for date: ${targetDate}`)

    // Fetch expenses for the target date, only for users with WhatsApp and expense reminders enabled
    const { data: expenses, error: expensesError } = await supabase
      .from('transactions')
      .select(`
        id,
        title,
        description,
        amount,
        date,
        created_at,
        user_id,
        category_id,
        categories(name, color, icon),
        profiles!inner(
          id,
          full_name,
          email,
          whatsapp,
          expense_reminders_enabled
        )
      `)
      .eq('type', 'expense')
      .eq('date', targetDate)
      .not('profiles.whatsapp', 'is', null)
      .eq('profiles.expense_reminders_enabled', true)
      .lt('created_at', targetDate + 'T23:59:59.999Z') // Only transactions created before today

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expenses' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group expenses by user
    const userExpensesMap = new Map()

    expenses?.forEach((expense: any) => {
      const userId = expense.user_id
      const profile = expense.profiles

      if (!userExpensesMap.has(userId)) {
        userExpensesMap.set(userId, {
          user_id: userId,
          user_name: profile.full_name || profile.email || 'Usuário',
          email: profile.email,
          whatsapp: profile.whatsapp,
          expenses_today: [],
          total_expenses: 0,
          expenses_count: 0
        })
      }

      const userExpenses = userExpensesMap.get(userId)
      userExpenses.expenses_today.push({
        id: expense.id,
        title: expense.title,
        description: expense.description,
        amount: expense.amount,
        category: expense.categories?.name || 'Sem categoria',
        category_color: expense.categories?.color || '#3B82F6',
        category_icon: expense.categories?.icon || 'folder'
      })
      userExpenses.total_expenses += parseFloat(expense.amount)
      userExpenses.expenses_count += 1
    })

    // Convert map to array and format response
    const usersWithExpenses = Array.from(userExpensesMap.values()).map(user => ({
      ...user,
      total_expenses: parseFloat(user.total_expenses.toFixed(2))
    }))

    const response = {
      date: targetDate,
      users_with_expenses: usersWithExpenses,
      total_users: usersWithExpenses.length,
      total_amount: parseFloat(
        usersWithExpenses.reduce((sum, user) => sum + user.total_expenses, 0).toFixed(2)
      ),
      generated_at: new Date().toISOString()
    }

    console.log(`Found ${usersWithExpenses.length} users with expenses for WhatsApp automation`)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in whatsapp-expense-reminders function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})