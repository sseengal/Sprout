import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
});

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
};

// Handle webhook events
async function handleWebhookEvent(req: Request) {
  try {
    const signature = req.headers.get('stripe-signature') || '';
    const body = await req.text();
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook Error', { status: 400 });
    }

    log('Webhook event received', { type: event.type });

    // Handle the checkout.session.completed event for trials
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { user_id, is_trial } = session.metadata || {};

      if (is_trial === 'true' && user_id) {
        log('Handling trial subscription for user', { userId: user_id });
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase configuration');
        }

        // Call the start_trial function
        const trialResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/start_trial`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'params=single-object'
          },
          body: JSON.stringify({ p_user_id: user_id })
        });

        const trialResult = await trialResponse.json();
        log('Trial start result', { 
          status: trialResponse.status,
          result: trialResult 
        });

        if (!trialResponse.ok || (trialResult && trialResult.success === false)) {
          throw new Error(trialResult?.message || 'Failed to start trial');
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ 
      error: 'Webhook handler failed', 
      details: err.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// Handle creating a checkout session
async function handleCreateCheckoutSession(req: Request) {
  try {
    const { user_id, user_email, plan_id, plan_name, amount, currency, interval } = await req.json();
    if (!user_id || !user_email || !plan_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!supabaseUrl || !supabaseKey || !stripeKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Simplified check - we'll always require payment method for trials
    const isTrialFlow = plan_id === 'trial_plan';
    
    log('Checkout session request', {
      user_email,
      plan_id,
      isTrialFlow
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
      const sessionParams: Record<string, any> = {
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
          is_trial: isTrialFlow ? 'true' : 'false'
        },
        subscription_data: {
          metadata: {
            user_id,
            plan_id,
            is_trial: isTrialFlow ? 'true' : 'false'
          },
          ...(isTrialFlow && {
            trial_period_days: 14,
            trial_settings: {
              end_behavior: {
                missing_payment_method: 'cancel'
              }
            }
          })
        },
        payment_method_collection: 'always', // Always require payment method for trials
        allow_promotion_codes: true,
      };

      log('Creating Stripe checkout session', {
        customerId: customer.id,
        priceId: price.id,
        isTrialFlow,
        trialDays: isTrialFlow ? 14 : 0,
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
      isTrial: isTrialFlow,
      trialDays: isTrialFlow ? 14 : 0
    }), { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal error', 
      details: String(err) 
    }), { 
      status: 500, 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      } 
    });
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if this is a webhook event
  const isWebhook = req.headers.get('stripe-signature');
  if (isWebhook) {
    return handleWebhookEvent(req);
  }

  // Otherwise, handle as a checkout session creation request
  return handleCreateCheckoutSession(req);
});
