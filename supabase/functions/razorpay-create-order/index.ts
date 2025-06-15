import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.8.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log('[Razorpay] OPTIONS preflight received');
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    // Log incoming request
    let reqBody;
    try {
      reqBody = await req.json();
      console.log('[Razorpay] Incoming create order request:', reqBody);
    } catch (jsonErr) {
      console.error('[Razorpay] Failed to parse JSON body', jsonErr);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: String(jsonErr) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { user_id, plan_id, plan_name, amount, currency, interval } = reqBody;
    if (!user_id || !plan_id || !amount) {
      console.error('[Razorpay] Missing required fields', { user_id, plan_id, amount });
      return new Response(
        JSON.stringify({ error: 'Missing required fields', fields: { user_id, plan_id, amount } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Log presence of env vars (not values)
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      RAZORPAY_KEY_ID: !!Deno.env.get('RAZORPAY_KEY_ID'),
      RAZORPAY_KEY_SECRET: !!Deno.env.get('RAZORPAY_KEY_SECRET')
    };
    console.log('[Razorpay] Env vars presence:', envCheck);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
    });
    // Try creating order in Razorpay with timeout and detailed logging
    let order;
    console.log('[Razorpay] About to call Razorpay API...');
    try {
      // Timeout helper
      const withTimeout = (promise, ms) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Razorpay API timeout')), ms))
        ]);
      };
      order = await withTimeout(
        razorpay.orders.create({
          amount: amount * 100, // paise
          currency: currency || 'INR',
          receipt: `order_rcpt_${user_id}_${Date.now()}`,
          notes: { user_id, plan_id, plan_name, interval: interval || 'month' },
        }),
        4000 // 4 seconds
      );
      console.log('[Razorpay] Razorpay order created:', order);
    } catch (rzErr) {
      console.error('[Razorpay] Razorpay API error or timeout:', rzErr);
      return new Response(
        JSON.stringify({ error: 'Razorpay API error or timeout', details: String(rzErr) }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Insert order into DB
    let orderData, orderError;
    try {
      const dbResp = await supabaseAdmin
        .from('orders')
        .insert({
          user_id,
          razorpay_order_id: order.id,
          plan_id,
          plan_name,
          amount,
          currency: currency || 'INR',
          interval: interval || 'month',
          status: 'created',
        })
        .select()
        .single();
      orderData = dbResp.data;
      orderError = dbResp.error;
      console.log('[Razorpay] DB insert response:', { orderData, orderError });
    } catch (dbErr) {
      console.error('[Razorpay] DB insert exception:', dbErr);
      return new Response(
        JSON.stringify({ error: 'DB insert exception', details: String(dbErr) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (orderError) {
      console.error('[Razorpay] DB insert error:', orderError);
      return new Response(
        JSON.stringify({ error: 'DB insert error', details: String(orderError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan_id,
        plan_name,
        interval: interval || 'month',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Razorpay] Uncaught error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create order', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
