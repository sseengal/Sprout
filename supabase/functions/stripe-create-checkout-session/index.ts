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
    
    // Check if user is eligible for a free trial
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!supabaseUrl || !supabaseKey || !stripeKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Check if user has an active subscription or has used a trial before
    const trialCheckUrl = `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(user_email)}&select=id,subscription_status,trial_start_date`;
    const trialCheck = await fetch(trialCheckUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!trialCheck.ok) {
      const error = await trialCheck.text();
      throw new Error(`Failed to check trial eligibility: ${error}`);
    }
    
    const [customerData] = await trialCheck.json();
    
    // Check various subscription states
    const hasActiveSubscription = customerData?.subscription_status === 'active';
    const isInTrial = customerData?.subscription_status === 'trialing';
    const hasUsedTrialBefore = !!customerData?.trial_start_date;
    
    // A user is eligible for a trial if:
    // 1. They don't have an active subscription AND
    // 2. They're not currently in a trial AND
    // 3. They've never started a trial before
    const isEligibleForTrial = !hasActiveSubscription && 
                              !isInTrial && 
                              !hasUsedTrialBefore;
    
    log('Trial eligibility check', {
      user_email,
      hasActiveSubscription,
      isInTrial,
      hasUsedTrialBefore,
      isEligibleForTrial,
      currentStatus: customerData?.subscription_status || 'unknown'
    });
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
    // 4. Create checkout session with trial if eligible
    let session;
    try {
      let sessionParams: Record<string, any> = {
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `sprout://payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `sprout://payment/cancel`,
        metadata: {
          user_id,
          plan_id,
          is_trial: isEligibleForTrial ? 'true' : 'false'
        },
        subscription_data: {
          metadata: {
            user_id,
            plan_id,
            is_trial: isEligibleForTrial ? 'true' : 'false'
          },
          // Only set trial period if eligible
          ...(isEligibleForTrial && {
            trial_period_days: 14,
            trial_settings: {
              end_behavior: {
                missing_payment_method: 'cancel'
              }
            }
          })
        },
        payment_method_collection: isEligibleForTrial ? 'if_required' : 'always',
        allow_promotion_codes: true,
      };

      log('Creating Stripe checkout session', {
        customerId: customer.id,
        priceId: price.id,
        isEligibleForTrial,
        trialDays: isEligibleForTrial ? 14 : 0,
        sessionParams: {
          ...sessionParams,
          // Don't log the entire customer object
          customer: '***REDACTED***',
          line_items: sessionParams.line_items.map((item: any) => ({
            ...item,
            // Don't log the entire price object
            price: item.price ? '***REDACTED***' : null
          }))
        }
      });

      const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(
          Object.entries(sessionParams).reduce((acc, [key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle nested objects like line_items and subscription_data
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (typeof subValue === 'object' && subValue !== null) {
                  // Handle deeply nested objects like subscription_data.metadata
                  Object.entries(subValue).forEach(([subSubKey, subSubValue]) => {
                    acc[`${key}[${subKey}][${subSubKey}]`] = String(subSubValue);
                  });
                } else {
                  acc[`${key}[${subKey}]`] = String(subValue);
                }
              });
            } else {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        )
      });

      session = await sessionResponse.json();
      
      if (!session || !session.url) {
        console.error('[Stripe] create_checkout_session API error:', session);
        throw new Error(session.error?.message || 'Failed to create Stripe checkout session');
      }
    } catch (err) {
      console.error('[Stripe] create_payment_link error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_payment_link error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ 
      url: session.url,
      isTrial: isEligibleForTrial,
      trialDays: isEligibleForTrial ? 14 : 0
    }), { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error', details: String(err) }), { status: 500, headers: corsHeaders });
  }
});
