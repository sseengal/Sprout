import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Enhanced logger function
const log = (message: string, data: any = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { ...data };
  
  // Redact sensitive information
  if (logData.headers?.Authorization) {
    logData.headers.Authorization = '***REDACTED***';
  }
  if (logData.stripeKey) {
    logData.stripeKey = '***REDACTED***';
  }
  
  console.log(`[${timestamp}] ${message}`, JSON.stringify(logData, null, 2));
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { user_id, user_email, plan_id, plan_name, amount, currency, interval } = await req.json();
    if (!user_id || !user_email || !plan_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }
    // 1. Create or fetch Stripe customer
    let customer;
    try {
      log('Starting customer creation process', { user_email });
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      
      log('Environment variables check', {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        hasStripeKey: !!stripeKey,
        supabaseUrlLength: supabaseUrl?.length,
        supabaseKeyLength: supabaseKey?.length,
        stripeKeyLength: stripeKey?.length
      });
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing required Supabase configuration');
      }
      
      if (!stripeKey) {
        throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
      }
      
      // Check if customer exists in our database
      const customerCheckUrl = `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(user_email)}&select=id,stripe_customer_id`;
      log('Checking for existing customer in database', { customerCheckUrl });
      
      const customerCheck = await fetch(customerCheckUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      log('Customer check response', {
        status: customerCheck.status,
        statusText: customerCheck.statusText,
        headers: Object.fromEntries(customerCheck.headers.entries())
      });
      
      const existingCustomer = await customerCheck.json();
      log('Existing customer data', { existingCustomer });
      
      if (existingCustomer && existingCustomer[0]?.stripe_customer_id) {
        log('Found existing Stripe customer ID', { stripeCustomerId: existingCustomer[0].stripe_customer_id });
        // Customer exists and has a Stripe ID, use it
        customer = { id: existingCustomer[0].stripe_customer_id };
      } else {
        // Create new customer in Stripe
        const customerData = new URLSearchParams();
        customerData.append('name', user_id);
        customerData.append('email', user_email);
        customerData.append('metadata[app_customer_email]', user_email);
        
        log('Creating new Stripe customer', { 
          url: 'https://api.stripe.com/v1/customers',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey?.substring(0, 10)}...`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': customerData.toString().length
          },
          body: customerData.toString()
        });
        
        const customerResp = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: customerData
        });
        
        const responseText = await customerResp.text();
        log('Stripe API response', {
          status: customerResp.status,
          statusText: customerResp.statusText,
          headers: Object.fromEntries(customerResp.headers.entries()),
          body: responseText
        });
        
        if (!customerResp.ok) {
          throw new Error(`Stripe API error: ${responseText}`);
        }
        
        customer = JSON.parse(responseText);
        if (!customer?.id) {
          throw new Error('Invalid customer data from Stripe');
        }
        
        log('Successfully created Stripe customer', { customerId: customer.id });
        
        // Save Stripe customer ID to our database
        if (existingCustomer && existingCustomer[0]?.id) {
          const updateUrl = `${supabaseUrl}/rest/v1/customers?id=eq.${existingCustomer[0].id}`;
          const updateData = {
            stripe_customer_id: customer.id,
            updated_at: new Date().toISOString()
          };
          
          log('Updating customer record with Stripe ID', {
            updateUrl,
            updateData
          });
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData)
          });
          
          const updateResponseText = await updateResponse.text();
          log('Customer update response', {
            status: updateResponse.status,
            statusText: updateResponse.statusText,
            body: updateResponseText
          });
          
          if (!updateResponse.ok) {
            log('Failed to update customer with Stripe ID', {
              error: updateResponseText,
              status: updateResponse.status
            });
          } else {
            log('Successfully updated customer with Stripe ID');
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      
      log('Error in customer creation', {
        error: errorMessage,
        stack: errorStack,
        errorType: err?.constructor?.name,
        errorRaw: JSON.stringify(err, Object.getOwnPropertyNames(err))
      });
      
      return new Response(JSON.stringify({ 
        error: 'Stripe create_customer error', 
        details: errorMessage,
        stack: errorStack
      }), { status: 500, headers: corsHeaders });
    }
    // 2. Create or fetch Stripe product
    let product;
    try {
      // Stripe: Create or get product
      const productResp = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: plan_name, description: plan_id })
      });
      product = await productResp.json();
      if (!product || !product.id) throw new Error('Failed to create/fetch Stripe product');
    } catch (err) {
      console.error('[Stripe] create_product error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_product error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    // 3. Create or fetch Stripe price
    let price;
    try {
      // Stripe: Create price
      const priceParams = new URLSearchParams({
        product: product.id,
        unit_amount: Math.round(Number(amount)).toString(),
        currency,
        'recurring[interval]': interval
      });
      const priceResp = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceParams
      });
      price = await priceResp.json();
      if (!price || !price.id) throw new Error('Failed to create/fetch Stripe price');
    } catch (err) {
      console.error('[Stripe] create_price error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_price error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    // 4. Create payment link
    let paymentLink;
    try {
      // Stripe: Create payment link
      const paymentLinkParams = new URLSearchParams({
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
      });
      const paymentLinkResp = await fetch('https://api.stripe.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: paymentLinkParams
      });
      paymentLink = await paymentLinkResp.json();
      if (!paymentLink || !paymentLink.url) {
        console.error('[Stripe] create_payment_link API error:', paymentLink);
        throw new Error(paymentLink.error?.message || 'Failed to create Stripe payment link');
      }
    } catch (err) {
      console.error('[Stripe] create_payment_link error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_payment_link error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ url: paymentLink.url }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error', details: String(err) }), { status: 500, headers: corsHeaders });
  }
});
