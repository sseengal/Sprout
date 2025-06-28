import { supabase } from './supabase';

export const purchaseAnalyses = async (userId) => {
  try {
    // Get the Stripe Checkout URL from our function
    const { data, error } = await supabase.functions.invoke('analyses-purchase', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) throw error;
    
    // Return the URL for the WebView to handle
    return { url: data.url };
  } catch (error) {
    console.error('Error in purchase flow:', error);
    throw new Error(error.message || 'Failed to start purchase');
  }
};
