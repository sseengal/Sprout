// Import required libraries
// Minimal Stripe webhook handler for Deno Edge Runtime
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

// Get environment variable with fallback for local testing
declare const Deno: any; // Temporary declaration for Deno environment
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// Simple logger
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, data || '')
}

// Main handler
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify the signature using the Stripe library
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )

    // Process the event
    log('Received event:', event.type)
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      log('Payment succeeded:', paymentIntent.id)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    log('Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Webhook error', message: error.message }),
      { status: 400, headers: corsHeaders }
    )
  }
}

// For local testing
// @ts-ignore - Deno global
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-ignore - Deno.serve is available
  Deno.serve(handler)
}
