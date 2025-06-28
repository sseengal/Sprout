import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Import Stripe for Deno
// @deno-types="https://deno.land/x/stripe@v13.0.0/types/index.d.ts"
import Stripe from "https://esm.sh/stripe@13.3.0?target=deno";

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
  'Content-Type': 'application/json'
};

// Analysis pack configuration
const ANALYSIS_PACK = {
  name: '10 Plant Analyses',
  description: 'One-time purchase of 10 plant identification analyses',
  quantity: 10,
  amount: 9900, // in paise (₹99)
  currency: 'inr',
  validityDays: 30 // days until expiry
};

serve(async (req) => {
  console.log('=== New Request ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  console.log('URL:', req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting request processing');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('Auth header present:', !!authHeader);
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }), 
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Verify the token and get user info
    console.log('Verifying user token');
    const userResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
        }
      }
    );
    
    if (!userResponse.ok) {
      const error = await userResponse.text();
      console.error('Auth error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }), 
        { status: 401, headers: corsHeaders }
      );
    }
    
    const user = await userResponse.json();
    const userId = user.id;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine user ID' }), 
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('Authenticated user ID:', userId);

    // Initialize Stripe
    console.log('Initializing Stripe');
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    // Create Stripe Checkout session
    console.log('Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: ANALYSIS_PACK.currency,
          product_data: {
            name: ANALYSIS_PACK.name,
            description: ANALYSIS_PACK.description,
          },
          unit_amount: ANALYSIS_PACK.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://sprout-app.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sprout-app.com/payment/cancel',
      client_reference_id: userId,
      metadata: {
        type: 'analysis_pack',
        quantity: ANALYSIS_PACK.quantity.toString(),
        validity_days: ANALYSIS_PACK.validityDays.toString(),
        user_id: userId
      }
    });

    console.log('Checkout session created:', { sessionId: session.id });
    
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
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
    Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') || '');
    Deno.env.set('STRIPE_SECRET_KEY', Deno.env.get('STRIPE_SECRET_KEY') || '');
    Deno.env.set('APP_URL', Deno.env.get('APP_URL') || 'http://localhost:19006');
    
    return await serve(req);
  });
}
