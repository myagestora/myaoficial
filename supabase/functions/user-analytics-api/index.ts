import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const endpoint = pathSegments[pathSegments.length - 1]
    
    // Return static test data
    if (endpoint === 'spending-trends') {
      return new Response(
        JSON.stringify({
          trends: [
            { month: "2025-06", income: 5000, expenses: 3200, balance: 1800, month_name: "junho de 2025" },
            { month: "2025-07", income: 8000, expenses: 8569.72, balance: -569.72, month_name: "julho de 2025" }
          ],
          period_months: 6,
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'category-breakdown') {
      return new Response(
        JSON.stringify({
          income: {
            total: 0,
            by_category: []
          },
          expenses: {
            total: 8569.72,
            by_category: [
              { category: "Alimentação", color: "#ef4444", icon: "utensils", total: 272.72, percentage: 3.18 },
              { category: "Transporte", color: "#3b82f6", icon: "car", total: 8000, percentage: 93.35 },
              { category: "Educação", color: "#10b981", icon: "book", total: 297, percentage: 3.47 }
            ]
          },
          period: 'month',
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endpoint === 'monthly-comparison') {
      return new Response(
        JSON.stringify({
          current_month: {
            income: 0,
            expenses: 8569.72,
            balance: -8569.72,
            month_name: "julho de 2025"
          },
          previous_month: {
            income: 5000,
            expenses: 3200,
            balance: 1800,
            month_name: "junho de 2025"
          },
          comparison: {
            income_change: -100,
            expenses_change: 167.8,
            income_trend: "down",
            expenses_trend: "up"
          },
          currency: 'BRL'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})