// Razorpay integration service for Sprout app
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Get Razorpay API key from environment variables
const RAZORPAY_KEY_ID = Constants.expoConfig?.extra?.razorpayKey || '';

// Get Supabase URL for Edge Functions
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';

// Debug flag
const DEBUG = (Constants.expoConfig?.extra?.env?.APP_ENV !== 'production');

/**
 * Creates a new Razorpay order via Supabase Edge Function
 * @param {Object} options Order options
 * @param {string} options.planId Plan identifier
 * @param {string} options.planName Human-readable plan name
 * @param {number} options.amount Amount in INR (not paise)
 * @param {string} options.currency Currency code (default: INR)
 * @param {string} options.interval Billing interval (month/year)
 * @returns {Promise<Object>} Order details including order ID
 */
export const createRazorpayOrder = async ({
  planId,
  planName,
  amount,
  currency = 'INR',
  interval = 'month'
}) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${SUPABASE_URL}/functions/v1/razorpay-create-order`;
    const body = {
      user_id: user.id,
      plan_id: planId,
      plan_name: planName,
      amount,
      currency,
      interval,
    };
    if (DEBUG) {
      console.log('[Razorpay] Creating order at:', url);
      console.log('[Razorpay] Request body:', body);
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch (_) {}
      console.error('[Razorpay] Order creation failed:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to create order');
    }
    const orderData = await response.json();
    if (DEBUG) console.log('[Razorpay] Order created:', orderData);
    return orderData;
  } catch (error) {
    console.error('[Razorpay] Error creating order:', error);
    throw error;
  }
};

/**
 * Verifies a Razorpay payment via Supabase Edge Function
 * @param {Object} paymentDetails Payment details from Razorpay
 * @param {string} paymentDetails.razorpay_payment_id Payment ID
 * @param {string} paymentDetails.razorpay_order_id Order ID
 * @param {string} paymentDetails.razorpay_signature Payment signature
 * @param {Object} orderDetails Original order details
 * @returns {Promise<Object>} Verification result
 */
export const verifyRazorpayPayment = async (paymentDetails, orderDetails) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${SUPABASE_URL}/functions/v1/razorpay-verify-payment`;
    const body = {
      ...paymentDetails,
      user_id: user.id,
      plan_id: orderDetails.plan_id,
      plan_name: orderDetails.plan_name,
      amount: orderDetails.amount,
      currency: orderDetails.currency,
      interval: orderDetails.interval,
    };
    if (DEBUG) {
      console.log('[Razorpay] Verifying payment at:', url);
      console.log('[Razorpay] Request body:', body);
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch (_) {}
      console.error('[Razorpay] Payment verification failed:', response.status, errorData);
      throw new Error(errorData.error || 'Payment verification failed');
    }
    const verificationData = await response.json();
    if (DEBUG) console.log('[Razorpay] Payment verified:', verificationData);
    return verificationData;
  } catch (error) {
    console.error('[Razorpay] Error verifying payment:', error);
    throw error;
  }
};

/**
 * Checks if the current user has an active subscription
 * @returns {Promise<Object>} Subscription status
 */
export const checkSubscriptionStatus = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { hasActiveSubscription: false, subscription: null };
    }
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${SUPABASE_URL}/functions/v1/razorpay-subscription-status?user_id=${user.id}`;
    if (DEBUG) {
      console.log('[Razorpay] Checking subscription status at:', url);
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
    });
    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch (_) {}
      console.error('[Razorpay] Error checking subscription:', response.status, errorData);
      return { hasActiveSubscription: false, subscription: null };
    }
    const subscriptionData = await response.json();
    if (DEBUG) console.log('[Razorpay] Subscription status:', subscriptionData);
    return {
      hasActiveSubscription: subscriptionData.has_active_subscription,
      subscription: subscriptionData.subscription,
    };
  } catch (error) {
    console.error('[Razorpay] Error checking subscription status:', error);
    return { hasActiveSubscription: false, subscription: null };
  }
};

/**
 * Generates Razorpay checkout options for WebView
 * @param {Object} order Order details from createRazorpayOrder
 * @param {Object} options Additional options
 * @returns {Object} Checkout options
 */
export const generateRazorpayCheckoutOptions = async (order, options = {}) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    key: RAZORPAY_KEY_ID,
    amount: order.amount * 100, // Convert to paise
    currency: order.currency,
    name: 'Sprout Premium',
    description: options.description || 'Sprout Premium Subscription',
    order_id: order.id,
    prefill: {
      email: user?.email || '',
      contact: options.contact || '',
      name: options.name || '',
    },
    theme: {
      color: '#4CAF50',
    },
  };
};

/**
 * Generates HTML for Razorpay checkout in WebView
 * @param {Object} options Checkout options from generateRazorpayCheckoutOptions
 * @returns {string} HTML content for WebView
 */
export const generateRazorpayCheckoutHTML = (options) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Razorpay Checkout</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f5f5f5;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          padding: 20px;
        }
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #4CAF50;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="loading">
          <div class="spinner"></div>
          <p>Initializing payment...</p>
        </div>
      </div>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const options = ${JSON.stringify(options)};
          
          const rzp = new Razorpay(options);
          
          rzp.on('payment.success', function(response) {
            // Redirect to success URL with payment details
            const successUrl = 'https://razorpay.com/payment/success?' + 
              'razorpay_payment_id=' + response.razorpay_payment_id + 
              '&razorpay_order_id=' + response.razorpay_order_id + 
              '&razorpay_signature=' + response.razorpay_signature;
            
            window.location.href = successUrl;
          });
          
          rzp.on('payment.error', function(response) {
            // Redirect to failure URL with error details
            window.location.href = 'https://razorpay.com/payment/failed?error=' + 
              encodeURIComponent(JSON.stringify(response));
          });
          
          // Open checkout automatically
          rzp.open();
        });
      </script>
    </body>
    </html>
  `;
};

/**
 * Parses payment details from success URL
 * @param {string} url Success URL from Razorpay
 * @returns {Object|null} Payment details or null if URL doesn't contain payment info
 */
export const parsePaymentDetailsFromUrl = (url) => {
  try {
    if (!url) return null;
    
    const urlObj = new URL(url);
    
    // Check if this is a success URL
    if (!url.includes('razorpay.com/payment/success')) {
      return null;
    }
    
    // Extract payment details from URL parameters
    const razorpay_payment_id = urlObj.searchParams.get('razorpay_payment_id');
    const razorpay_order_id = urlObj.searchParams.get('razorpay_order_id');
    const razorpay_signature = urlObj.searchParams.get('razorpay_signature');
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return null;
    }
    
    return {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    };
  } catch (error) {
    console.error('[Razorpay] Error parsing payment details from URL:', error);
    return null;
  }
};
