import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { user_id, user_email, plan_id, plan_name, amount, currency, interval } = await req.json();
    if (!user_id || !user_email || !plan_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }
    // 1. Create or fetch Stripe customer
    let customer;
    try {
      // Stripe: Create or get customer
      const customerResp = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: user_id, email: user_email })
      });
      customer = await customerResp.json();
      if (!customer || !customer.id) throw new Error('Failed to create/fetch Stripe customer');
    } catch (err) {
      console.error('[Stripe] create_customer error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_customer error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    // 2. Create or fetch Stripe product
    let product;
    try {
      // Stripe: Create or get product
      const productResp = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: plan_name, description: plan_id })
      });
      product = await productResp.json();
      if (!product || !product.id) throw new Error('Failed to create/fetch Stripe product');
    } catch (err) {
      console.error('[Stripe] create_product error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_product error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    // 3. Create or fetch Stripe price
    let price;
    try {
      // Stripe: Create price
      const priceParams = new URLSearchParams({
        product: product.id,
        unit_amount: Math.round(Number(amount)).toString(),
        currency,
        'recurring[interval]': interval
      });
      const priceResp = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceParams
      });
      price = await priceResp.json();
      if (!price || !price.id) throw new Error('Failed to create/fetch Stripe price');
    } catch (err) {
      console.error('[Stripe] create_price error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_price error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    // 4. Create payment link
    let paymentLink;
    try {
      // Stripe: Create payment link
      const paymentLinkParams = new URLSearchParams({
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
      });
      const paymentLinkResp = await fetch('https://api.stripe.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: paymentLinkParams
      });
      paymentLink = await paymentLinkResp.json();
      if (!paymentLink || !paymentLink.url) {
        console.error('[Stripe] create_payment_link API error:', paymentLink);
        throw new Error(paymentLink.error?.message || 'Failed to create Stripe payment link');
      }
    } catch (err) {
      console.error('[Stripe] create_payment_link error:', err);
      return new Response(JSON.stringify({ error: 'Stripe create_payment_link error', details: String(err) }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ url: paymentLink.url }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error', details: String(err) }), { status: 500, headers: corsHeaders });
  }
});
