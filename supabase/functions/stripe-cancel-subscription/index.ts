// @deno-types="https://deno.land/x/types/deno.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno'

// Add Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  version: {
    deno: string;
  };
};

// Types
interface CustomerData {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  subscription_status: string
  plan_type?: string
  billing_interval?: string
  subscription_start_date?: string
  subscription_end_date?: string
  cancel_at_period_end?: boolean
  trial_start?: string
  trial_end?: string
  next_billing_date?: string
}

interface ErrorResponse {
  success: boolean
  error: string
  details?: string
}

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create error responses
function createErrorResponse(status: number, error: string, details?: string): Response {
  const response: ErrorResponse = { success: false, error }
  if (details) response.details = details
  
  return new Response(
    JSON.stringify(response),
    { 
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  )
}

// Helper function to get user ID from request
function getUserId(req: Request): string {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) {
    throw new Error('Missing userId parameter')
  }
  return userId
}

// Helper function to get customer data
async function getCustomerData(userId: string, supabase: SupabaseClient): Promise<CustomerData> {
  try {
    const trimmedUserId = userId.trim()
    console.log('Fetching customer data for user ID:', trimmedUserId)
    
    // Log the exact query we're about to execute
    console.log('Executing query:', {
      table: 'customers',
      select: '*',
      eq: { user_id: trimmedUserId }
    })
    
    // First, check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'customers' })
      .single()
      
    console.log('Table info:', tableInfo || 'No table info available')
    
    // Now try to get the customer data
    const { data: customerData, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', trimmedUserId)
      
    // If no data, try with different case for user_id (PostgreSQL is case-sensitive)
    if ((!customerData || customerData.length === 0) && error) {
      console.log('Trying with different case for user_id column...')
      const { data: altCaseData, error: altCaseError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_ID', trimmedUserId)  // Try with uppercase ID
        
      if (altCaseData && altCaseData.length > 0) {
        console.log('Found customer with user_ID (uppercase) column')
        return formatCustomerData(altCaseData[0])
      }
    }

    if (error) {
      console.error('Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Database error: ${error.message}`)
    }

    if (!customerData || customerData.length === 0) {
      console.error('No customer found with user ID:', trimmedUserId)
      throw new Error('Customer not found')
    }

    if (customerData.length > 1) {
      console.warn(`Found ${customerData.length} customers with the same user ID:`, trimmedUserId)
      // For now, just take the first one that has a subscription
      const activeCustomer = customerData.find(c => c.stripe_subscription_id)
      if (activeCustomer) {
        console.log('Selected customer with active subscription:', activeCustomer.id)
        return formatCustomerData(activeCustomer)
      }
      throw new Error('No active subscription found for this user')
    }

    const customer = customerData[0]
    console.log('Customer data found:', {
      customer_id: customer.id,
      user_id: customer.user_id,
      stripe_customer_id: customer.stripe_customer_id,
      stripe_subscription_id: customer.stripe_subscription_id,
      subscription_status: customer.subscription_status
    })

    if (!customer.stripe_subscription_id) {
      throw new Error('No active subscription found for this customer')
    }

    return formatCustomerData(customer)

  } catch (error: any) {
    console.error('Error in getCustomerData:', error)
    throw new Error(`Failed to fetch customer data: ${error?.message || 'Unknown error'}`)
  }
}

// Format customer data to ensure consistent structure
function formatCustomerData(data: any): CustomerData {
  if (!data) {
    throw new Error('No customer data provided to format')
  }
  
  return {
    user_id: data.user_id || data.user_ID || data.User_ID || data.USER_ID,
    stripe_customer_id: data.stripe_customer_id || data.stripe_customer_ID,
    stripe_subscription_id: data.stripe_subscription_id || data.stripe_subscription_ID,
    subscription_status: data.subscription_status,
    plan_type: data.plan_type,
    billing_interval: data.billing_interval,
    subscription_start_date: data.subscription_start_date,
    subscription_end_date: data.subscription_end_date,
    cancel_at_period_end: data.cancel_at_period_end,
    trial_start: data.trial_start,
    trial_end: data.trial_end,
    next_billing_date: data.next_billing_date
  }
}

// Main request handler
serve(async (req: Request) => {
  // Wrap everything in a try-catch to ensure we log all errors
  try {
    console.log('=== New Request ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Log environment variables (without sensitive values)
    console.log('Environment:', {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '***' : 'NOT SET',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? '***' : 'NOT SET',
      STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY') ? '***' : 'NOT SET'
    })
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('Handling CORS preflight')
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      const error = `Method not allowed: ${req.method}`
      console.error(error)
      return createErrorResponse(405, error)
    }

    // Main function logic starts here
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      const error = 'Missing required environment variables: ' + 
                   `SUPABASE_URL: ${!!supabaseUrl}, ` +
                   `SUPABASE_SERVICE_ROLE_KEY: ${!!serviceRoleKey}`
      console.error(error)
      throw new Error(error)
    }

    console.log('Initializing Supabase admin client')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    // Alias for backward compatibility
    const supabase = supabaseAdmin

    // Get user ID from request
    console.log('Getting user ID from request')
    const userId = getUserId(req)
    console.log('User ID from request:', userId)
    
    // Get customer data with detailed logging
    console.log('Fetching customer data for user ID:', userId)
    
    try {
      // Try to get customer data directly
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (customerError) {
        console.error('Error in customer query:', customerError)
        throw new Error(`Failed to query customer data: ${customerError.message}`)
      }

      if (!customerData) {
        throw new Error(`No customer found with user ID: ${userId}`)
      }

      const customer = formatCustomerData(customerData)
      console.log('Formatted customer data:', {
        user_id: customer.user_id,
        stripe_customer_id: customer.stripe_customer_id,
        stripe_subscription_id: customer.stripe_subscription_id,
        subscription_status: customer.subscription_status
      })
    
      if (!customer.stripe_subscription_id) {
        console.error('No subscription ID found for customer')
        throw new Error('No active subscription found for this customer')
      }

      console.log('Cancelling subscription at period end')
      
      // Update the customer record in the database
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          cancel_at_period_end: true,
          subscription_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating customer record:', updateError)
        throw new Error('Failed to update subscription status')
      }

      // Cancel the subscription in Stripe
      const subscription = await stripe.subscriptions.update(
        customer.stripe_subscription_id,
        { cancel_at_period_end: true }
      )

      console.log('Subscription cancellation processed:', subscription.id)

      // Return success response
      const response = {
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      }
      
      console.log('Returning success response:', response)
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    } catch (error) {
      console.error('Error in subscription cancellation:', error)
      throw error // This will be caught by the outer try-catch
    }

  } catch (error: any) {
    // If error is already an ErrorResponse, return it directly
    if (error?.status && error?.body) {
      console.error('Returning error response:', error.status, error.body)
      return error
    }
    
    // Log detailed error information
    const errorDetails = {
      message: error?.message || 'Unknown error',
      name: error?.name || 'Error',
      stack: error?.stack,
      code: error?.code,
      status: error?.status,
      details: error?.details
    }
    
    console.error('=== UNHANDLED ERROR ===')
    console.error('Error details:', JSON.stringify(errorDetails, null, 2))
    
    // Return appropriate error response
    if (error?.message?.includes('token')) {
      return createErrorResponse(401, 'Authentication failed', error.message)
    }
    if (error?.message?.includes('not found')) {
      return createErrorResponse(404, error.message)
    }
    
    return createErrorResponse(
      error?.status || 500, 
      error?.message || 'An unexpected error occurred',
      JSON.stringify(process.env.NODE_ENV === 'development' ? errorDetails : undefined)
    )
  }
})
