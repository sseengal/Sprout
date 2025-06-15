// Supabase Edge Function: verify-payment for Razorpay
// (See full implementation instructions in next steps)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.8.6'
import crypto from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      user_id,
      plan_id,
      plan_name,
      amount,
      currency,
      interval,
    } = await req.json()
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    const isValidSignature = generatedSignature === razorpay_signature
    if (!isValidSignature) {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('razorpay_order_id', razorpay_order_id)
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        razorpay_payment_id,
        razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id)
    if (orderError) throw orderError
    const now = new Date()
    const expiryDate = new Date(now)
    if (interval === 'year') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
    }
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single()
    if (existingSub) {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id,
          plan_name,
          status: 'active',
          start_date: now.toISOString(),
          end_date: expiryDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', user_id)
      if (subError) throw subError
    } else {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id,
          plan_id,
          plan_name,
          status: 'active',
          start_date: now.toISOString(),
          end_date: expiryDate.toISOString(),
        })
      if (subError) throw subError
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        subscription: {
          plan_id,
          plan_name,
          start_date: now.toISOString(),
          end_date: expiryDate.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to verify payment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

