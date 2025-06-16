// Stripe webhook handler for Deno Edge Runtime
// Using only web-standard APIs for compatibility

declare const Deno: any; // Temporary declaration for Deno environment

// Get environment variables
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Database tables
const TABLES = {
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  CUSTOMERS: 'customers'
};

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

// Supabase client with REST API implementation
interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string, options?: { limit?: number }) => Promise<{ data: any; error: any }>;
    upsert: (data: any) => Promise<{ data: any; error: any }>;
    update: (filters: Record<string, any>, data: any) => Promise<{ data: any; error: any }>;
    eq: (column: string, value: any) => { eq: (column: string, value: any) => any };
    single: () => any;
  };
}

function createSupabaseClient(): SupabaseClient {
  const execute = async (method: string, path: string, params: any = {}) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    
    // Add query parameters for GET requests
    if (method === 'GET' && params.query) {
      Object.entries(params.query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, `eq.${value}`);
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: method !== 'GET' ? JSON.stringify(params.data || {}) : undefined
    });
    
    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Supabase error: ${error}`);
    }
    
    // Handle empty responses
    const responseText = await response.text().catch(() => '');
    const data = responseText ? JSON.parse(responseText) : null;
    return { data, error: null };
  };
  
  return {
    from: (table: string) => ({
      select: async (columns: string, options: { limit?: number } = {}) => {
        let url = `${table}?select=${columns}`;
        
        if (options.limit) {
          url += `&limit=${options.limit}`;
        }
        
        const { data, error } = await execute('GET', url, {
          query: {},
          data: {}
        });
        return { data, error };
      },
      upsert: async (data: any) => {
        return execute('POST', table, { data });
      },
      update: async (filters: Record<string, any>, data: any) => {
        return execute('PATCH', table, { query: filters, data });
      },
      eq: (column: string, value: any) => ({
        eq: (col: string, val: any) => ({
          // This is a no-op for now, just return the value
          value: val
        })
      }),
      single: () => ({
        // This is a no-op for now
      })
    })
  };
}

// Verify Stripe webhook signature
async function verifyStripeWebhook(
  body: string,
  signature: string,
  secret: string
): Promise<{ verified: boolean; event?: any; error?: string }> {
  try {
    // Extract timestamp and signatures from header
    const signatureItems = signature.split(',').reduce((acc, item) => {
      const [key, value] = item.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parseInt(signatureItems['t']);
    if (isNaN(timestamp)) {
      return { verified: false, error: 'Invalid timestamp in signature' };
    }

    // Recover the signed content
    const signedContent = `${timestamp}.${body}`;
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedContent)
    );

    // Convert signature to hex
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures
    if (signatureItems['v1'] !== signatureHex) {
      return { verified: false, error: 'Signature verification failed' };
    }

    // Parse and return the event
    const event = JSON.parse(body);
    return { verified: true, event };
  } catch (error) {
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : 'Unknown error during verification' 
    };
  }
}

// Main handler
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Read the request body as text first
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the webhook signature with the raw body text
    const { verified, event, error } = await verifyStripeWebhook(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    
    // Parse the body as JSON for processing
    const eventData = JSON.parse(body);

    if (!verified) {
      log('Webhook signature verification failed:', { error });
      return new Response(
        JSON.stringify({ 
          error: 'Webhook signature verification failed',
          message: error 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Process the event
    log('Processing event:', event?.type || 'unknown');
    
    const supabase = await createSupabaseClient();
    
    // Ensure crypto is available for UUID generation
    const crypto = globalThis.crypto || await import('crypto').then(mod => mod.webcrypto);
    
    try {
      // Use the parsed event data
      const eventType = eventData?.type || event?.type;
      
      switch (eventType) {
        case 'payment_intent.created':
        case 'payment_intent.succeeded': {
          const paymentIntent = eventData?.data?.object || event?.data?.object;
          if (!paymentIntent) {
            throw new Error('No payment intent data found in event');
          }
          log(`Payment ${event.type.split('.').pop()}:`, paymentIntent.id);
          
          // Get user ID from metadata or use a default one
          let userId = paymentIntent.metadata?.user_id || '3db8cff7-e2b7-4900-a8c0-c7f7841e4c2d';
          log(`Using user ID for payment: ${userId}`);
          
          // Check if the user exists in the customers table using direct REST API
          const checkCustomerUrl = `${SUPABASE_URL}/rest/v1/customers?user_id=eq.${userId}&select=user_id`;
          const checkResponse = await fetch(checkCustomerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          const customerData = await checkResponse.json();
          
          if (!checkResponse.ok || !customerData || customerData.length === 0) {
            // Create a customer record if it doesn't exist
            const createCustomerUrl = `${SUPABASE_URL}/rest/v1/customers`;
            await fetch(createCustomerUrl, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                user_id: userId,
                email: paymentIntent.receipt_email || 'test@example.com',
                stripe_customer_id: paymentIntent.customer || `cus_test_${Date.now()}`,
                name: paymentIntent.customer_details?.name || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            });
          }
          
          // Generate a UUID for the payment record
          const paymentId = crypto.randomUUID();
          
          // Insert payment record using direct REST API
          const paymentData = {
            id: paymentId, // Use generated UUID
            user_id: userId,
            payment_intent_id: paymentIntent.id, // Store Stripe payment intent ID
            stripe_payment_intent_id: paymentIntent.id, // Also store in stripe-specific column
            amount: paymentIntent.amount || 0,
            currency: paymentIntent.currency || 'usd',
            status: paymentIntent.status || 'succeeded',
            payment_method: paymentIntent.payment_method || 'card',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const paymentUrl = `${SUPABASE_URL}/rest/v1/payments`;
          const paymentResponse = await fetch(paymentUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(paymentData)
          });
          
          if (!paymentResponse.ok) {
            const error = await paymentResponse.text();
            console.error('Error inserting payment:', error);
            throw new Error(`Failed to insert payment record: ${error}`);
          }
          
          const uuid = crypto.randomUUID();
          
          // Create or update payment record with valid user ID
          await supabase.from(TABLES.PAYMENTS).upsert({
            id: uuid,
            user_id: userId,
            stripe_payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount || 0,
            currency: paymentIntent.currency || 'usd',
            status: paymentIntent.status || 'succeeded',
            // Use the first payment method type if available, otherwise default to 'card'
            payment_method: paymentIntent.payment_method || 
                         (paymentIntent.payment_method_types && paymentIntent.payment_method_types[0]) || 
                         'card',
            created_at: paymentIntent.created 
              ? new Date(paymentIntent.created * 1000).toISOString() 
              : new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          break;
        }
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          log(`Subscription ${event.type.split('.').pop()}:`, subscription.id);
          
          // Create or update subscription record
          await supabase.from(TABLES.SUBSCRIPTIONS).upsert({
            id: subscription.id,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            created_at: new Date(subscription.created * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });
          
          break;
        }
        
        case 'customer.created':
        case 'customer.updated': {
          const customer = event.data.object;
          log(`Customer ${event.type.split('.').pop()}:`, customer.id);
          
          // Create or update customer record
          await supabase.from(TABLES.CUSTOMERS).upsert({
            id: customer.id,
            stripe_customer_id: customer.id,
            email: customer.email,
            name: customer.name,
            metadata: JSON.stringify(customer.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          break;
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          log('Invoice payment succeeded:', invoice.id);
          
          // Create payment record for invoice
          await supabase.from(TABLES.PAYMENTS).upsert({
            id: `inv_${invoice.id}`,
            payment_intent_id: invoice.payment_intent,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            description: `Invoice ${invoice.number}`,
            metadata: JSON.stringify(invoice.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          log('Invoice payment failed:', invoice.id);
          
          // Update payment record with failure
          await supabase.from(TABLES.PAYMENTS).upsert({
            id: `inv_${invoice.id}`,
            payment_intent_id: invoice.payment_intent,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            failure_reason: invoice.billing_reason || 'payment_failed',
            description: `Failed payment for invoice ${invoice.number}`,
            metadata: JSON.stringify(invoice.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          break;
        }
        
        default:
          log(`Unhandled event type: ${event?.type}`);
      }
    } catch (error) {
      log('Error processing event:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ received: true, event: event?.type }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error processing webhook:', { error: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing error',
        message: errorMessage 
      }),
      { status: 400, headers: corsHeaders }
    );
  }
}

// For local testing
// @ts-ignore - Deno global
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-ignore - Deno.serve is available
  Deno.serve(handler);
}
