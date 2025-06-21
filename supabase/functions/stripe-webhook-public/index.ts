// Stripe webhook handler for Deno Edge Runtime
// Minimal implementation focused on payment/subscription events only

// Import Stripe
// @deno-types="https://deno.land/x/stripe@v13.0.0/types/index.d.ts"
import Stripe from "https://esm.sh/stripe@13.3.0?target=deno";

// Environment variables
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Enhanced logger with structured logging
function log(message: string, data: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    ...data,
    // Add any additional context here
  };
  console.log(JSON.stringify(logEntry, null, 2));
}

// Helper to find customer by email with enhanced logging
async function findCustomerByEmail(email: string) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=*`;
    log('Looking up customer by email', { email, url });
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Error finding customer by email', { email, error: errorText });
      throw new Error(`Failed to find customer by email: ${errorText}`);
    }

    const customers = await response.json();
    const customer = customers?.[0] || null;
    log('Customer lookup result', { email, found: !!customer });
    return customer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Error in findCustomerByEmail', { 
      email, 
      error: errorMessage,
      errorType: error?.constructor?.name || typeof error
    });
    throw error;
  }
}

// Helper to update customer record in Supabase with enhanced logging
async function updateCustomer(customerId: string, updateData: Record<string, any>) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`;
    log('Updating customer record', { customerId, updateData });
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        ...updateData,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      log('Failed to update customer', { customerId, error });
      throw new Error(`Failed to update customer: ${error}`);
    }
    
    log('Successfully updated customer', { customerId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Error in updateCustomer', { 
      customerId, 
      error: errorMessage,
      errorType: error?.constructor?.name || typeof error
    });
    throw error;
  }
}

// Handle subscription events with enhanced logging and error handling
async function handleSubscriptionEvent(subscription: any) {
  log('Processing subscription event', { 
    subscription_id: subscription.id,
    status: subscription.status,
    customer: subscription.customer,
    customer_email: subscription.customer_email
  });

  let customer;
  let customerId: string | null = null;
  
  // Try to get customer by email first
  if (subscription.customer_email) {
    try {
      customer = await findCustomerByEmail(subscription.customer_email);
      if (customer) {
        customerId = customer.id.toString();
        log('Found customer by email', { 
          email: subscription.customer_email, 
          customerId 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('Error finding customer by email', { 
        email: subscription.customer_email, 
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error
      });
    }
  }
  
  // Fall back to stripe_customer_id
  if (!customerId && subscription.customer) {
    // First try to find by stripe_customer_id
    const customerUrl = `${SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${subscription.customer}&select=id,email`;
    const customerResponse = await fetch(customerUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const customerData = await customerResponse.json();
    if (customerResponse.ok && customerData?.[0]?.id) {
      customerId = customerData[0].id;
      log(`Found customer by stripe_customer_id: ${subscription.customer}`, { customerId });
    } else {
      // If not found by stripe_customer_id, try to find by metadata
      if (subscription.customer) {
        const customerIdStr = subscription.customer as string;
        const stripeCustomer = await stripe.customers.retrieve(customerIdStr);
        if (stripeCustomer && !stripeCustomer.deleted && 'email' in stripeCustomer && stripeCustomer.email) {
          const customerByEmail = await findCustomerByEmail(stripeCustomer.email);
          if (customerByEmail) {
            customerId = customerByEmail.id;
            log(`Found customer by email from Stripe metadata: ${stripeCustomer.email}`, { customerId });
            
            // Update the customer record with the stripe_customer_id
            await updateCustomer(customerId, {
              stripe_customer_id: customerIdStr
            });
          }
        }
      }
    }
  }

  if (!customerId) {
    throw new Error(`Customer not found for subscription: ${subscription.id}`);
  }
  const planType = subscription.plan?.interval === 'year' ? 'yearly' : 'monthly';

  // Prepare subscription update with safe date handling
  const updateData: Record<string, any> = {
    subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    plan_type: planType,
    billing_interval: subscription.plan?.interval || 'month',
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  };

  // Handle trial status
  if (subscription.status === 'trialing') {
    updateData.subscription_status = 'trialing';
    log('Subscription is in trial period', { 
      trial_start: subscription.trial_start,
      trial_end: subscription.trial_end 
    });
  }

  // Helper function to safely convert Stripe timestamps to ISO strings
  const safeDate = (timestamp: number | null | undefined): string | null => {
    return timestamp ? new Date(timestamp * 1000).toISOString() : null;
  };

  // Handle next_billing_date - use current_period_end from subscription
  if (subscription.current_period_end) {
    const nextBillingDate = safeDate(subscription.current_period_end);
    updateData.next_billing_date = nextBillingDate;
    log(`Updating next_billing_date from subscription.current_period_end: ${nextBillingDate}`);
  } else {
    log('No current_period_end found in subscription, skipping next_billing_date update', {
      subscription_id: subscription.id,
      status: subscription.status
    });
  }
  
  if (subscription.start_date) {
    updateData.subscription_start_date = safeDate(subscription.start_date);
  }
  
  if (subscription.ended_at) {
    updateData.subscription_end_date = safeDate(subscription.ended_at);
  }
  
  // Handle trial dates
  if (subscription.trial_start) {
    updateData.trial_start_date = safeDate(subscription.trial_start);
    log('Set trial start date', { date: updateData.trial_start_date });
  }
  
  if (subscription.trial_end) {
    updateData.trial_end_date = safeDate(subscription.trial_end);
    log('Set trial end date', { date: updateData.trial_end_date });
    
    // If trial ended and subscription is active, update status
    const trialEnd = new Date(subscription.trial_end * 1000);
    if (trialEnd <= new Date() && subscription.status === 'active') {
      updateData.subscription_status = 'active';
      log('Trial period ended, marking subscription as active');
    }
  }

  await updateCustomer(customerId, updateData);
  log(`Updated subscription ${subscription.id} for customer ${customerId}`, updateData);
}

// Handle invoice payment events
async function handleInvoiceEvent(invoice: any) {
  // Skip if this is a zero-amount invoice (common for trials)
  if (invoice.amount_due === 0 && invoice.amount_paid === 0) {
    log('Skipping zero-amount invoice', { invoice_id: invoice.id });
    return;
  }
  try {
    log(`Processing invoice ${invoice.id}`, { 
      status: invoice.status,
      paid: invoice.paid,
      amount_paid: invoice.amount_paid,
      customer: invoice.customer,
      subscription: invoice.subscription
    });

    let customer;
    let customerId: string | null = null;
    
    // Try to get customer by email first
    if (invoice.customer_email) {
      customer = await findCustomerByEmail(invoice.customer_email);
      if (customer) {
        customerId = customer.id;
        log(`Found customer by email for invoice: ${invoice.customer_email}`, { customerId });
      }
    }
    
    // Fall back to subscription ID
    if (!customerId && invoice.subscription) {
      const customerUrl = `${SUPABASE_URL}/rest/v1/customers?stripe_subscription_id=eq.${invoice.subscription}&select=id,subscription_status`;
      const customerResponse = await fetch(customerUrl, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      const customerData = await customerResponse.json();
      if (customerResponse.ok && customerData?.[0]?.id) {
        customerId = customerData[0].id;
        log(`Found customer by subscription ID: ${invoice.subscription}`, { customerId });
      }
    }
    
    // Fall back to customer ID
    if (!customerId && invoice.customer) {
      // First try to find by stripe_customer_id
      const customerIdStr = invoice.customer as string;
      const customerUrl = `${SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${customerIdStr}&select=id,subscription_status,email`;
      const customerResponse = await fetch(customerUrl, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      const customerData = await customerResponse.json();
      if (customerResponse.ok && customerData?.[0]?.id) {
        customerId = customerData[0].id;
        log(`Found customer by Stripe customer ID: ${invoice.customer}`, { customerId });
      } else {
        // If not found by stripe_customer_id, try to find by metadata
        const stripeCustomer = await stripe.customers.retrieve(invoice.customer as string);
        if (stripeCustomer && !stripeCustomer.deleted && 'email' in stripeCustomer && stripeCustomer.email) {
          const customerByEmail = await findCustomerByEmail(stripeCustomer.email);
          if (customerByEmail) {
            customerId = customerByEmail.id;
            log(`Found customer by email from Stripe metadata: ${stripeCustomer.email}`, { customerId });
            
            // Update the customer record with the stripe_customer_id
            await updateCustomer(customerId, {
              stripe_customer_id: invoice.customer as string
            });
          }
        }
      }
    }
    
    if (!customerId) {
      throw new Error('Customer not found for invoice');
    }
    // More flexible check for successful payments
    const isPaid = invoice.paid || invoice.status === 'paid' || invoice.status === 'succeeded';
    const isFailed = !isPaid && invoice.attempted && !invoice.paid;

    // Prepare payment update
    const updateData: Record<string, any> = {
      last_payment_date: new Date().toISOString(),
      last_payment_amount: isPaid ? invoice.amount_paid : invoice.amount_due,
      last_payment_status: isPaid ? 'succeeded' : 'failed',
      payment_method_type: invoice.payment_intent?.payment_method_types?.[0] || 'card'
    };

    // Log payment status for debugging
    log('Payment status:', { 
      invoiceId: invoice.id, 
      paid: invoice.paid, 
      status: invoice.status, 
      isPaid, 
      isFailed 
    });

    // Handle subscription-specific updates
    if (invoice.subscription) {
      // Check if this is the first payment after trial
      if (invoice.billing_reason === 'subscription_cycle' && 
          invoice.subscription_details?.metadata?.was_trial) {
        updateData.subscription_status = 'active';
        log('Trial period ended, subscription now active', { 
          invoice_id: invoice.id,
          subscription_id: invoice.subscription 
        });
      }
      // Don't update next_billing_date here - it should come from subscription events
      // to avoid race conditions and ensure consistency
      log('Skipping next_billing_date update from invoice event - should be handled by subscription events', {
        invoice_id: invoice.id,
        subscription_id: invoice.subscription
      });

      // Handle first payment
      if (invoice.billing_reason === 'subscription_create' && isPaid) {
        // Check if this is a trial subscription
        const isTrial = invoice.subscription_details?.metadata?.trial_period_days || 
                       (await stripe.subscriptions.retrieve(invoice.subscription)).trial_end !== null;
        
        if (isTrial) {
          updateData.subscription_status = 'trialing';
          log('Trial subscription created', { invoice_id: invoice.id });
        } else {
          updateData.subscription_status = 'active';
        }
        
        updateData.subscription_start_date = new Date().toISOString();
        updateData.stripe_subscription_id = invoice.subscription;
      }  
      // Handle failed payment
      else if (isFailed) {
        updateData.subscription_status = 'past_due';
        updateData.payment_failure_reason = invoice.billing_reason || 'payment_failed';
      }
    }

    // Update customer record with payment information
    await updateCustomer(customerId, updateData);
    
    log(`Successfully updated customer ${customerId} with payment info`, {
      invoice_id: invoice.id,
      status: isPaid ? 'paid' : 'failed',
      amount: updateData.last_payment_amount,
      subscription_status: updateData.subscription_status
    });
    
  } catch (error) {
    log('Error in handleInvoiceEvent:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoice_id: invoice.id,
      customer: invoice.customer,
      subscription: invoice.subscription
    });
    throw error; // Re-throw to be handled by the main handler
  }
}

// Verify Stripe webhook signature
async function verifyStripeWebhook(
  body: string,
  signature: string,
  secret: string
): Promise<{ verified: boolean; event?: any; error?: string }> {
  try {
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    if (!signature) {
      throw new Error('No signature provided in the request');
    }

    log('Constructing Stripe event', { 
      hasSecret: !!secret,
      signature: signature.substring(0, 20) + '...',
      bodyLength: body.length
    });

    // Verify the webhook signature using the raw body and signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret
    );
    
    log('Successfully verified webhook signature', {
      eventId: event.id,
      eventType: event.type
    });
    
    return { verified: true, event };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during verification';
    log('Error verifying webhook signature:', { 
      error: errorMessage,
      signature: signature ? `${signature.substring(0, 10)}...` : 'no-signature',
      secretPresent: !!secret,
      secretPrefix: secret ? `${secret.substring(0, 5)}...` : 'no-secret'
    });
    
    return { 
      verified: false, 
      error: errorMessage
    };
  }
}

// Main handler
export default async function handler(req: Request): Promise<Response> {
  // Log incoming request for debugging
  log('Incoming request', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    const error = `Method not allowed: ${req.method}`;
    log(error);
    return new Response(
      JSON.stringify({ error }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Read the request body as text first
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      const error = 'No Stripe signature provided in headers';
      log(error);
      return new Response(
        JSON.stringify({ error }),
        { status: 400, headers: corsHeaders }
      );
    }

    log('Verifying webhook signature', { 
      hasWebhookSecret: !!STRIPE_WEBHOOK_SECRET,
      signatureLength: signature.length
    });

    // Verify the webhook signature
    const { verified, event, error: verifyError } = await verifyStripeWebhook(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    
    if (!verified) {
      log('Webhook signature verification failed:', { 
        error: verifyError,
        signature,
        webhookSecretPresent: !!STRIPE_WEBHOOK_SECRET,
        requestBodyPreview: body.substring(0, 200) + (body.length > 200 ? '...' : '')
      });
      return new Response(
        JSON.stringify({ 
          error: 'Webhook signature verification failed',
          details: verifyError || 'No error details available'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse the event data
    const eventData = JSON.parse(body);
    const eventType = eventData?.type || 'unknown';
    log(`Processing event: ${eventType}`);

    // Route the event to the appropriate handler
    try {
      const eventObject = eventData.data.object;
      
      switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionEvent(eventObject);
          break;
          
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await handleInvoiceEvent(eventObject);
          break;
          
        case 'customer.created':
          log('Skipping customer.created - customer creation handled by auth flow', {
            customer_id: eventObject.id,
            email: eventObject.email
          });
          break;
          
        case 'customer.updated':
          // Only update Stripe-specific fields
          if (eventObject.invoice_settings?.default_payment_method) {
            const customerId = eventObject.id;
            await updateCustomer(customerId, {
              default_payment_method: eventObject.invoice_settings.default_payment_method
            });
          }
          break;
          
        default:
          log(`Unhandled event type: ${eventType}`);
      }

      // Acknowledge receipt of the event
      return new Response(
        JSON.stringify({ received: true, event: eventType }),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Error processing event:', { 
        error: errorMessage,
        errorType: error?.constructor?.name || typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return new Response(
        JSON.stringify({ error: 'Event processing error', message: errorMessage }),
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error in webhook handler:', { 
      error: errorMessage,
      errorType: error?.constructor?.name || typeof error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ error: 'Webhook processing error', message: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// For local testing
// @ts-ignore - Deno global
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-ignore - Deno.serve is available
  Deno.serve(handler);
}