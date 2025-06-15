import Constants from 'expo-constants';

const STRIPE_API_URL = Constants.expoConfig?.extra?.supabaseUrl + '/functions/v1/stripe-create-checkout-session';
const DEBUG = (Constants.expoConfig?.extra?.env?.APP_ENV !== 'production');

// Pass 'supabase' as an argument to access the current session
export async function createStripeCheckoutSession({ user_id, user_email, plan_id, plan_name, amount, currency = 'usd', interval = 'month' }, supabase) {
  try {
    if (DEBUG) {
      console.log('[Stripe] Creating checkout session at:', STRIPE_API_URL);
      console.log('[Stripe] Request body:', { user_id, user_email, plan_id, plan_name, amount, currency, interval });
    }
    // Get the current session JWT for Authorization header
    let jwt = undefined;
    if (supabase && supabase.auth && supabase.auth.getSession) {
      const { data } = await supabase.auth.getSession();
      jwt = data?.session?.access_token;
    }
    if (!jwt && Constants.expoConfig?.extra?.supabaseAnonKey) {
      jwt = Constants.expoConfig.extra.supabaseAnonKey;
    }
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': jwt ? `Bearer ${jwt}` : undefined,
    };
    const res = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id, user_email, plan_id, plan_name, amount, currency, interval })
    });
    const data = await res.json();
    if (DEBUG) {
      console.log('[Stripe] Response:', data);
    }
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Failed to create Stripe checkout session');
    }
    return data.url;
  } catch (err) {
    if (DEBUG) console.error('[Stripe] Error creating checkout session:', err);
    throw err;
  }
}
