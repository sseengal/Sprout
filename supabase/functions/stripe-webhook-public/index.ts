// Minimal Stripe webhook handler for Deno Edge Runtime
// Using only web-standard APIs to avoid compatibility issues

// Get environment variables
declare const Deno: any; // Temporary declaration for Deno environment
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

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
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the webhook signature
    const { verified, event, error } = await verifyStripeWebhook(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

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
    log('Received event:', event?.type);
    
    if (event?.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      log('Payment succeeded:', paymentIntent.id);
      // Add your payment processing logic here
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
