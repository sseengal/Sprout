// Stripe webhook handler for Deno Edge Runtime
// Using only web-standard APIs for compatibility

declare const Deno: any; // Temporary declaration for Deno environment

// Helper function to generate UUID v4
function generateUuid() {
  // @ts-ignore - crypto.randomUUID() is available in Edge Runtime
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation if randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get environment variables
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Database tables
// Note: We've consolidated to a single customers table that includes subscription and payment data
const TABLES = {
  CUSTOMERS: 'customers',
  // Legacy tables - maintained for backward compatibility
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions'
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
          const checkCustomerUrl = `${SUPABASE_URL}/rest/v1/customers?user_id=eq.${userId}&select=id,user_id,stripe_customer_id`;
          const checkResponse = await fetch(checkCustomerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          let customerData = await checkResponse.json();
          let customerId;
          
          if (!checkResponse.ok || !customerData || customerData.length === 0) {
            // Create a customer record if it doesn't exist
            const createCustomerUrl = `${SUPABASE_URL}/rest/v1/customers`;
            const newCustomer = {
              user_id: userId,
              email: paymentIntent.receipt_email || 'test@example.com',
              stripe_customer_id: paymentIntent.customer || `cus_test_${Date.now()}`,
              name: paymentIntent.customer_details?.name || '',
              // Required fields with defaults
              subscription_status: 'inactive',
              plan_type: 'free', // Default plan type
              billing_interval: 'month', // Default billing interval
              // Optional fields
              phone: paymentIntent.customer_details?.phone || '',
              // Timestamps
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const createResponse = await fetch(createCustomerUrl, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(newCustomer)
            });
            
            if (createResponse.ok) {
              const createdCustomer = await createResponse.json();
              customerId = createdCustomer[0]?.id;
            } else {
              const error = await createResponse.text();
              console.error('Error creating customer:', error);
              throw new Error(`Failed to create customer record: ${error}`);
            }
          } else {
            customerId = customerData[0].id;
          }
          
          // Update customer with payment intent information
          const customerUpdateData: Record<string, any> = {
            last_payment_date: new Date().toISOString(),
            last_payment_amount: paymentIntent.amount || 0,
            last_payment_status: paymentIntent.status || 'succeeded',
            payment_method_type: paymentIntent.payment_method_types?.[0] || 'card',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString()
          };
          
          // Update customer with payment data
          const customerUpdateUrl = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`;
          const customerUpdateResponse = await fetch(customerUpdateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(customerUpdateData)
          });
          
          if (!customerUpdateResponse.ok) {
            const error = await customerUpdateResponse.text();
            console.error('Error updating customer payment data:', error);
            throw new Error(`Failed to update customer payment data: ${error}`);
          }
          
          // For backward compatibility, also create a payment record
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
            payment_method: paymentIntent.payment_method || 
                         (paymentIntent.payment_method_types && paymentIntent.payment_method_types[0]) || 
                         'card',
            created_at: paymentIntent.created 
              ? new Date(paymentIntent.created * 1000).toISOString() 
              : new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const paymentUrl = `${SUPABASE_URL}/rest/v1/payments`;
          await fetch(paymentUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(paymentData)
          });
          
          break;
        }
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = eventData?.data?.object || event?.data?.object;
          if (!subscription) {
            throw new Error('No subscription data found in event');
          }
          log(`Subscription ${eventType.split('.').pop()}:`, subscription.id);
          
          // Get customer by stripe_customer_id
          const customerUrl = `${SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${subscription.customer}&select=id,user_id`;
          const customerResponse = await fetch(customerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          const customerData = await customerResponse.json();
          if (!customerResponse.ok || !customerData || customerData.length === 0) {
            log('Customer not found for subscription:', subscription.customer);
            throw new Error(`Customer not found for subscription: ${subscription.customer}`);
          }
          
          const customer = customerData[0];
          
          // Determine plan type based on interval
          const planType = subscription.plan?.interval === 'year' ? 'yearly' : 'monthly';
          
          // Prepare subscription data for customers table
          const subscriptionUpdateData = {
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            plan_type: planType,
            billing_interval: subscription.plan?.interval || 'month',
            amount: subscription.plan?.amount || 0,
            currency: subscription.plan?.currency || 'usd',
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            subscription_start_date: subscription.start_date ? new Date(subscription.start_date * 1000).toISOString() : null,
            subscription_end_date: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            trial_start_date: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          };
          
          // Update customer with subscription data
          const customerUpdateUrl = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`;
          const customerUpdateResponse = await fetch(customerUpdateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(subscriptionUpdateData)
          });
          
          if (!customerUpdateResponse.ok) {
            const error = await customerUpdateResponse.text();
            console.error('Error updating customer subscription data:', error);
            throw new Error(`Failed to update customer subscription data: ${error}`);
          }
          
          // For backward compatibility, also update the subscriptions table
          const legacySubscriptionData = {
            id: subscription.id,
            user_id: customer.user_id,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            created_at: new Date(subscription.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            plan_id: subscription.plan?.id,
            plan_name: subscription.plan?.nickname,
            price_id: subscription.plan?.id,
            amount: subscription.plan?.amount,
            currency: subscription.plan?.currency,
            interval: subscription.plan?.interval,
            interval_count: subscription.plan?.interval_count,
            start_date: new Date(subscription.start_date * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
          };
          
          // Insert/update subscription using direct REST API (for backward compatibility)
          const subscriptionUrl = `${SUPABASE_URL}/rest/v1/subscriptions`;
          await fetch(subscriptionUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(legacySubscriptionData)
          });
          
          break;
        }
        
        case 'customer.created':
        case 'customer.updated': {
          const customer = eventData?.data?.object || event?.data?.object;
          if (!customer) {
            throw new Error('No customer data found in event');
          }
          log(`Customer ${eventType.split('.').pop()}:`, customer.id);
          
          // Check if the customer already exists
          const checkCustomerUrl = `${SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${customer.id}&select=id`;
          const checkResponse = await fetch(checkCustomerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          const existingCustomer = await checkResponse.json();
          const method = existingCustomer && existingCustomer.length > 0 ? 'PATCH' : 'POST';
          const customerId = existingCustomer && existingCustomer.length > 0 ? existingCustomer[0].id : null;
          
          // Prepare customer data
          const customerData: Record<string, any> = {
            stripe_customer_id: customer.id,
            email: customer.email || 'no-email@example.com', // Ensure required field is set
            name: customer.name || '',
            phone: customer.phone || null,
            address: customer.address ? JSON.stringify(customer.address) : null,
            default_payment_method: customer.invoice_settings?.default_payment_method || null,
            metadata: JSON.stringify(customer.metadata || {}),
            // Set required fields with defaults if not provided
            subscription_status: 'inactive',
            plan_type: 'free',
            billing_interval: 'month',
            updated_at: new Date().toISOString()
          };
          
          // If it's a new customer, add created_at and ensure user_id is set
          if (method === 'POST') {
            customerData.created_at = customer.created 
              ? new Date(customer.created * 1000).toISOString() 
              : new Date().toISOString();
            
            // Ensure user_id is set (required field)
            if (!customer.metadata?.user_id) {
              // If no user_id in metadata, generate a new UUID
              customerData.user_id = generateUuid();
              log('Generated new user_id for customer:', customerData.user_id);
            } else {
              customerData.user_id = customer.metadata.user_id;
            }
          }
          
          // Insert/update customer using direct REST API
          const customerUrl = method === 'PATCH' 
            ? `${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}` 
            : `${SUPABASE_URL}/rest/v1/customers`;
            
          const customerResponse = await fetch(customerUrl, {
            method: method,
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
            },
            body: JSON.stringify(customerData)
          });
          
          if (!customerResponse.ok) {
            const error = await customerResponse.text();
            console.error('Error updating customer:', error);
            throw new Error(`Failed to update customer record: ${error}`);
          }
          
          break;
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = eventData?.data?.object || event?.data?.object;
          if (!invoice) {
            throw new Error('No invoice data found in event');
          }
          log('Invoice payment succeeded:', invoice.id);
          
          // Find the customer by subscription ID or customer ID
          let customerQuery;
          if (invoice.subscription) {
            customerQuery = `stripe_subscription_id=eq.${invoice.subscription}`;
          } else if (invoice.customer) {
            customerQuery = `stripe_customer_id=eq.${invoice.customer}`;
          } else {
            throw new Error('No subscription or customer ID found in invoice');
          }
          
          const customerUrl = `${SUPABASE_URL}/rest/v1/customers?${customerQuery}&select=id,user_id`;
          const customerResponse = await fetch(customerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          const customerData = await customerResponse.json();
          if (!customerResponse.ok || !customerData || customerData.length === 0) {
            log('Customer not found for invoice:', invoice.id);
            throw new Error(`Customer not found for invoice: ${invoice.id}`);
          }
          
          const customer = customerData[0];
          
          // Update customer with payment information
          const customerUpdateData: Record<string, any> = {
            last_payment_date: new Date().toISOString(),
            last_payment_amount: invoice.amount_paid || 0,
            last_payment_status: 'succeeded',
            payment_method_type: invoice.payment_method_details?.type || 'card',
            updated_at: new Date().toISOString()
          };
          
          // If this is a subscription payment, update the subscription details
          if (invoice.subscription) {
            // Update next billing date
            customerUpdateData.next_billing_date = invoice.lines?.data[0]?.period?.end 
              ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() 
              : null;
              
            // If this is the first payment, update subscription status
            if (invoice.billing_reason === 'subscription_create') {
              customerUpdateData.subscription_status = 'active';
              customerUpdateData.subscription_start_date = new Date().toISOString();
              
              // If there's a trial, set trial dates
              if (invoice.lines?.data[0]?.period?.start && invoice.lines?.data[0]?.period?.end) {
                customerUpdateData.trial_start_date = new Date(invoice.lines.data[0].period.start * 1000).toISOString();
                customerUpdateData.trial_end_date = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
              }
            }
          }
          
          // Update customer with payment data
          const customerUpdateUrl = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`;
          const customerUpdateResponse = await fetch(customerUpdateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(customerUpdateData)
          });
          
          if (!customerUpdateResponse.ok) {
            const error = await customerUpdateResponse.text();
            console.error('Error updating customer payment data:', error);
            throw new Error(`Failed to update customer payment data: ${error}`);
          }
          
          // For backward compatibility, also create a payment record
          const paymentData = {
            id: `inv_${invoice.id}`,
            user_id: customer.user_id,
            subscription_id: invoice.subscription,
            payment_intent_id: invoice.payment_intent,
            stripe_payment_intent_id: invoice.payment_intent,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid || 0,
            currency: invoice.currency || 'usd',
            status: 'succeeded',
            description: `Invoice ${invoice.number}`,
            metadata: JSON.stringify(invoice.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const paymentUrl = `${SUPABASE_URL}/rest/v1/payments`;
          await fetch(paymentUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(paymentData)
          });
          
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = eventData?.data?.object || event?.data?.object;
          if (!invoice) {
            throw new Error('No invoice data found in event');
          }
          log('Invoice payment failed:', invoice.id);
          
          // Find the customer by subscription ID or customer ID
          let customerQuery;
          if (invoice.subscription) {
            customerQuery = `stripe_subscription_id=eq.${invoice.subscription}`;
          } else if (invoice.customer) {
            customerQuery = `stripe_customer_id=eq.${invoice.customer}`;
          } else {
            throw new Error('No subscription or customer ID found in invoice');
          }
          
          const customerUrl = `${SUPABASE_URL}/rest/v1/customers?${customerQuery}&select=id,user_id`;
          const customerResponse = await fetch(customerUrl, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          });
          
          const customerData = await customerResponse.json();
          if (!customerResponse.ok || !customerData || customerData.length === 0) {
            log('Customer not found for invoice:', invoice.id);
            throw new Error(`Customer not found for invoice: ${invoice.id}`);
          }
          
          const customer = customerData[0];
          
          // Update customer with failed payment information
          const customerUpdateData: Record<string, any> = {
            last_payment_date: new Date().toISOString(),
            last_payment_amount: invoice.amount_due || 0,
            last_payment_status: 'failed',
            payment_failure_reason: invoice.billing_reason || 'payment_failed',
            updated_at: new Date().toISOString()
          };
          
          // Handle subscription status based on billing reason
          if (invoice.subscription) {
            switch (invoice.billing_reason) {
              case 'subscription_cycle':
                customerUpdateData.subscription_status = 'past_due';
                log('Marking subscription as past_due for subscription:', invoice.subscription);
                break;
                
              case 'subscription_create':
                // If this is the first payment attempt and it failed
                customerUpdateData.subscription_status = 'incomplete';
                log('Subscription creation payment failed, marking as incomplete:', invoice.subscription);
                break;
                
              case 'subscription_update':
                // Handle subscription update failures
                customerUpdateData.subscription_status = 'past_due';
                log('Subscription update payment failed, marking as past_due:', invoice.subscription);
                break;
            }
            
            // If there are retry attempts, log them
            if (invoice.attempt_count > 1) {
              log(`Payment failed attempt ${invoice.attempt_count} for subscription:`, invoice.subscription);
            }
          }
          
          // Update customer with payment failure data
          const customerUpdateUrl = `${SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`;
          const customerUpdateResponse = await fetch(customerUpdateUrl, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(customerUpdateData)
          });
          
          if (!customerUpdateResponse.ok) {
            const error = await customerUpdateResponse.text();
            console.error('Error updating customer payment failure data:', error);
            throw new Error(`Failed to update customer payment failure data: ${error}`);
          }
          
          // For backward compatibility, also create a payment record
          const paymentData = {
            id: `inv_${invoice.id}`,
            user_id: customer.user_id,
            subscription_id: invoice.subscription,
            payment_intent_id: invoice.payment_intent,
            stripe_payment_intent_id: invoice.payment_intent,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due || 0,
            currency: invoice.currency || 'usd',
            status: 'failed',
            payment_method: invoice.payment_intent?.payment_method || null,
            failure_reason: invoice.billing_reason || 'payment_failed',
            description: `Failed payment for invoice ${invoice.number}`,
            metadata: JSON.stringify(invoice.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const paymentUrl = `${SUPABASE_URL}/rest/v1/payments`;
          await fetch(paymentUrl, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(paymentData)
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
