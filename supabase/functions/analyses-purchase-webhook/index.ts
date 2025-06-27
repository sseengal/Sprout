import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Import and initialize Stripe
import Stripe from 'https://esm.sh/stripe@13.3.0?target=deno';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Enhanced logger function
const log = (message: string, data: any = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { ...data };
  
  // Redact sensitive information
  if (logData.headers?.authorization) {
    logData.headers.authorization = '***REDACTED***';
  }
  
  console.log(`[${timestamp}] ${message}`, JSON.stringify(logData, null, 2));
};

// Handle analysis pack purchase
async function handleAnalysisPackPurchase(session: any) {
  try {
    // Get user ID from metadata (preferred) or client_reference_id
    const userId = session.metadata?.user_id || session.client_reference_id;
    const { metadata, payment_status } = session;
    
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Invalid or missing user ID in webhook payload');
    }
    
    if (payment_status !== 'paid') {
      log('Payment not completed, skipping', { sessionId: session.id, payment_status });
      return;
    }

    if (metadata?.type !== 'analysis_pack') {
      log('Not an analysis pack purchase, skipping', { sessionId: session.id });
      return;
    }

    log('Processing analysis pack purchase', { 
      userId, 
      sessionId: session.id,
      metadata 
    });

    const quantity = parseInt(metadata.quantity || '10');
    const validityDays = parseInt(metadata.validity_days || '30');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Insert into analysis_purchases
    const { error } = await supabase
      .from('analysis_purchases')
      .insert({
        user_id: userId,
        quantity,
        used_count: 0,
        amount_paid: session.amount_total,
        stripe_payment_intent_id: session.payment_intent,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      log('Error recording analysis pack purchase', { error, userId, sessionId: session.id });
      throw error;
    }

    log('Successfully recorded analysis pack purchase', { 
      userId, 
      sessionId: session.id,
      quantity,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: errorMessage,
      sessionId: session?.id,
      userId: session?.metadata?.user_id || session?.client_reference_id,
      paymentStatus: session?.payment_status,
      metadata: session?.metadata
    };
    
    console.error('Error in handleAnalysisPackPurchase:', JSON.stringify(errorDetails, null, 2));
    
    // Re-throw with more context
    const enhancedError = new Error(`Failed to process analysis pack purchase: ${errorMessage}`);
    (enhancedError as any).details = errorDetails;
    throw enhancedError;
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

    // Verify the webhook signature using the raw body and signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret
    );
    
    return { verified: true, event };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during verification';
    return { 
      verified: false, 
      error: errorMessage 
    };
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Read the request body as text first
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      log('No Stripe signature provided');
      return new Response(
        JSON.stringify({ error: 'No Stripe signature provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify webhook signature
    const { verified, event, error } = await verifyStripeWebhook(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );

    if (!verified) {
      log('Webhook signature verification failed', { error });
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse the event data
    const eventData = JSON.parse(body);
    const eventType = eventData?.type || 'unknown';
    log(`Processing event: ${eventType}`);

    // Handle checkout.session.completed event
    if (eventType === 'checkout.session.completed') {
      await handleAnalysisPackPurchase(eventData.data.object);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error in webhook handler:', { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: 'Webhook handler error', message: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// For local testing
// @ts-ignore - Deno global
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-ignore - Deno.serve is available
  Deno.serve(async (req) => {
    // Mock environment variables for local testing
    Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') || '');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') || '');
    Deno.env.set('STRIPE_WEBHOOK_SECRET', Deno.env.get('STRIPE_WEBHOOK_SECRET') || '');
    
    return await serve(req);
  });
}
