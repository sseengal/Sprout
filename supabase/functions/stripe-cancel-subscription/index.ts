import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let userId: string
    let supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Check if we have a JWT token
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Verify JWT token if provided
      try {
        const token = authHeader.split(' ')[1]
        // Use Supabase's built-in JWT verification
        const { data: { user }, error } = await supabaseClient.auth.getUser(token)
        if (error || !user) {
          throw new Error('Invalid or expired token')
        }
        userId = user.id
      } catch (error: unknown) {
        const jwtError = error instanceof Error ? error : new Error('Unknown error')
        console.error('JWT verification error:', jwtError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid or expired token',
            details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
          }),
          { 
            status: 401, 
            headers: { 
              'Content-Type': 'application/json', 
              ...corsHeaders 
            } 
          }
        )
      }
    } else {
      // Fall back to userId from query params if no JWT
      const url = new URL(req.url)
      const queryUserId = url.searchParams.get('userId')
      if (!queryUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing userId parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
      userId = queryUserId
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Get customer data from database
    console.log('=== Starting database query ===')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    console.log('Database URL:', supabaseUrl)
    console.log('User ID being queried (raw):', `'${userId}'`)
    console.log('User ID length:', userId.length)
    console.log('User ID type:', typeof userId)
    
    let customerData: any = null
    let customerError: any = null
    
    try {
      // Try with exact match first
      console.log('Trying exact user_id match...')
      const exactMatch = await supabaseClient
        .from('customers')
        .select('stripe_customer_id, stripe_subscription_id, subscription_status, user_id')
        .eq('user_id', userId)
        .single()
      
      customerData = exactMatch.data
      customerError = exactMatch.error
      
      console.log('=== Query 1: Exact match ===')
      console.log('Query result:', { data: customerData, error: customerError })

      // If no match, try with trimmed user_id
      if (!customerData && !customerError) {
        console.log('No results with exact match, trying with trimmed user_id...')
        const trimmedUserId = userId.trim()
        const trimmedMatch = await supabaseClient
          .from('customers')
          .select('stripe_customer_id, stripe_subscription_id, subscription_status, user_id')
          .eq('user_id', trimmedUserId)
          .single()
        
        customerData = trimmedMatch.data
        customerError = trimmedMatch.error
        console.log('=== Query 2: Trimmed ID ===')
        console.log('Query result:', { data: customerData, error: customerError })
      }

      // If still no match, try a more permissive query
      if (!customerData && !customerError) {
        console.log('No results with trimmed ID, trying to list all customers...')
        const allCustomers = await supabaseClient
          .from('customers')
          .select('id, user_id, stripe_customer_id, stripe_subscription_id, subscription_status')
          .limit(5)
        
        console.log('=== Query 3: First 5 customers ===')
        console.log('All customers:', allCustomers.data)
      }

      if (customerError) {
        console.error('Database error details:', {
          message: customerError.message,
          code: customerError.code,
          details: customerError.details,
          hint: customerError.hint,
        })
        throw new Error(`Database query failed: ${customerError.message}`)
      }

      if (!customerData) {
        console.error('No customer data found in any query attempt')
        throw new Error('Customer record not found in database')
      }

      console.log('Found customer data:', customerData)
      
      if (!customerData.stripe_subscription_id) {
        console.error('Customer found but has no subscription:', customerData)
        throw new Error('No active subscription found for this customer')
      }

      console.log('Found customer with subscription:', customerData.stripe_subscription_id)
      
      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(
        customerData.stripe_subscription_id,
        { cancel_at_period_end: true }
      )

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription will be canceled at the end of the current period',
          cancel_at: subscription.cancel_at
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      )
      
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      console.error('Error in database operation:', error.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json', 
            ...corsHeaders 
          } 
        }
      )
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      customerData.stripe_subscription_id,
      { cancel_at_period_end: true }
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription will be canceled at the end of the current period',
        cancel_at: subscription.cancel_at
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error canceling subscription:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to cancel subscription' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
