import { supabase } from './supabase';

// Get total purchased credits for a user (used + available)
export async function getTotalPurchasedCredits(userId) {
  const { data, error } = await supabase
    .from('analysis_purchases')
    .select('quantity')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting total purchased credits:', error);
    return 0;
  }

  return data.reduce((total, purchase) => total + (purchase.quantity || 0), 0);
}

// Get available credits for a user
export async function getAvailableCredits(userId) {
  const { data, error } = await supabase
    .rpc('get_available_credits', { p_user_id: userId })
    .single();

  if (error) {
    console.error('Error getting credits:', error);
    return { total: 0, trial: 0, subscription: 0, purchase: 0 };
  }

  return {
    total: data.total_available || 0,
    trial: data.trial_available || 0,
    subscription: data.subscription_available || 0,
    purchase: data.purchase_available || 0
  };
}

// Use one analysis credit
export async function useAnalysis(userId) {
  const { data, error } = await supabase
    .rpc('consume_credit', { p_user_id: userId });

  if (error) {
    console.error('Error using analysis:', error);
    return { success: false, error };
  }

  return { 
    success: true, 
    remaining: data?.remaining || 0 
  };
}

// Create trial for new user
export async function createTrial(userId) {
  const { error } = await supabase
    .from('analysis_purchases')
    .insert({
      user_id: userId,
      quantity: 5,
      used_count: 0,
      purchase_type: 'trial',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

  if (error) {
    console.error('Error creating trial:', error);
    return { success: false, error };
  }

  return { success: true };
}

// Check if user has active subscription
export async function hasActiveSubscription(userId) {
  const { data, error } = await supabase
    .from('customers')
    .select('subscription_status, subscription_end_date, cancel_at_period_end')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error checking subscription status:', error);
    return false;
  }

  const now = new Date();
  const isActive = data.subscription_status === 'active' && 
                 new Date(data.subscription_end_date) > now &&
                 !data.cancel_at_period_end;

  console.log('Subscription check:', { 
    status: data.subscription_status, 
    endDate: data.subscription_end_date, 
    cancelAtEnd: data.cancel_at_period_end,
    isActive
  });

  return isActive;
}
