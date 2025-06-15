import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  const key_id = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
  const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
  const basicAuth = 'Basic ' + btoa(`${key_id}:${key_secret}`);
  let result = { step: 'start' };
  try {
    result.step = 'fetching';
    const resp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'GET',
      headers: {
        'Authorization': basicAuth,
        'Content-Type': 'application/json',
      },
    });
    result.status = resp.status;
    result.statusText = resp.statusText;
    result.headers = {};
    resp.headers.forEach((v, k) => { result.headers[k] = v });
    try {
      result.body = await resp.text();
    } catch (e) {
      result.body = '[unreadable]';
    }
    result.step = 'done';
  } catch (err) {
    result.step = 'error';
    result.error = String(err);
  }
  console.log('[Razorpay Connectivity Test]', result);
  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
