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

// Simple logger
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
}

// Helper to find customer by email
async function findCustomerByEmail(email: string) {
  const url = `${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to find customer by email: ${await response.text()}`);
  }

  const customers = await response.json();
  return customers?.[0] || null;
}

// Helper to update customer record in Supabase
async function updateCustomer(customerId: string, updateData: Record<string, any>) {
  const url = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`;
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
    throw new Error(`Failed to update customer: ${error}`);
  }
}

// Handle subscription events
async function handleSubscriptionEvent(subscription: any) {
  let customer;
  let customerId: string | null = null;
  
  // Try to get customer by email first
  if (subscription.customer_email) {
    customer = await findCustomerByEmail(subscription.customer_email);
    if (customer) {
      customerId = customer.id.toString(); // Ensure customerId is a string
      log(`Found customer by email: ${subscription.customer_email}`, { customerId });
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

  // Prepare subscription update
  const updateData = {
    subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    plan_type: planType,
    billing_interval: subscription.plan?.interval || 'month',
    next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    subscription_start_date: subscription.start_date ? new Date(subscription.start_date * 1000).toISOString() : null,
    subscription_end_date: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    trial_start_date: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  };

  await updateCustomer(customerId, updateData);
  log(`Updated subscription ${subscription.id} for customer ${customerId}`, updateData);
}

// Handle invoice payment events
async function handleInvoiceEvent(invoice: any) {
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
    const isPaid = invoice.paid && invoice.status === 'paid';
    const isFailed = !isPaid && invoice.attempted && !invoice.paid;

    // Prepare payment update
    const updateData: Record<string, any> = {
      last_payment_date: new Date().toISOString(),
      last_payment_amount: isPaid ? invoice.amount_paid : invoice.amount_due,
      last_payment_status: isPaid ? 'succeeded' : 'failed',
      payment_method_type: invoice.payment_intent?.payment_method_types?.[0] || 'card'
    };

    // Handle subscription-specific updates
    if (invoice.subscription) {
      // Convert Stripe timestamp to ISO string
      updateData.next_billing_date = invoice.lines?.data?.[0]?.period?.end 
        ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
        : null;

      // Handle first payment
      if (invoice.billing_reason === 'subscription_create' && isPaid) {
        updateData.subscription_status = 'active';
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
      log('Error processing event:', error);
      
      return new Response(
        JSON.stringify({ error: 'Event processing error', message: errorMessage }),
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error in webhook handler:', error);
    
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