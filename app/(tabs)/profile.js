import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import SubscriptionCard from '../../components/profile/SubscriptionCard';
import AnalysisUsageCard from '../../components/profile/AnalysisUsageCard';
import ProfileHeader from '../../components/profile/ProfileHeader';
import SignOutButton from '../../components/profile/SignOutButton';
import { useAuth } from '../../contexts/AuthContext';
import { purchaseAnalyses } from '../../lib/analyses';
import { supabase } from '../../lib/supabase';
import { getAvailableCredits, hasActiveSubscription, getTotalPurchasedCredits } from '../../lib/analysisCredits';
import { formatDate, getStatusColor, getStatusText, getTrialDaysRemaining } from '../../utils/profileUtils';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState(null);
  const [analysisUsage, setAnalysisUsage] = useState({
    used: 0,
    total: 0,
    remaining: 0,
    isTrial: false
  });
  
  // Handle deep links for payment success/cancel
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event?.url;
      if (!url) return;
      
      console.log('Deep link received:', url);
      
      if (url.includes('payment/success')) {
        setShowWebView(false);
        // Refresh subscription data
        fetchSubscription();
        Alert.alert('Success', 'Your purchase was successful!');
      } else if (url.includes('payment/cancel')) {
        setShowWebView(false);
        Alert.alert('Cancelled', 'Your purchase was cancelled');
      }
    };

    // Get the initial URL if the app was opened from a link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Clean up
    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  // Fetch subscription and analysis usage data
  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    try {
      setSubscriptionLoading(true);
      console.log('Fetching subscription and analysis data for user:', user.id);
      
      // Use the utility functions to get the data
      const [isSubscribed, credits, customerData] = await Promise.all([
        hasActiveSubscription(user.id),
        getAvailableCredits(user.id),
        // Get customer data for additional subscription details
        supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single()
          .then(({ data }) => data)
      ]);
      
      console.log('Subscription status:', isSubscribed ? 'Active' : 'Not active');
      console.log('Customer data:', customerData);
      console.log('Available credits:', credits);
      
      // Check if user is on trial
      const isOnTrial = customerData?.trial_end_date && new Date(customerData.trial_end_date) > new Date();
      
      // Update the subscription state with customer data if available
      if (customerData) {
        setSubscription({
          subscription_status: isOnTrial ? 'trialing' : (isSubscribed ? 'active' : 'inactive'),
          plan_type: customerData.plan_type,
          billing_interval: customerData.billing_interval,
          subscription_start_date: customerData.subscription_start_date,
          subscription_end_date: customerData.subscription_end_date,
          next_billing_date: customerData.next_billing_date,
          cancel_at_period_end: customerData.cancel_at_period_end,
          trial_end_date: customerData.trial_end_date
        });
      } else {
        setSubscription({
          subscription_status: credits.trial > 0 ? 'trialing' : (isSubscribed ? 'active' : 'inactive'),
          trial_end_date: credits.trial > 0 ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null
        });
      }
      
      // Update analysis usage state
      // Calculate used credits based on total purchased vs available
      // For now, we'll show available credits as remaining and calculate used as (total - remaining)
      // This is a temporary solution - we should track used credits separately in the future
      const remainingCredits = Math.max(0, credits.total);
      const totalPurchased = await getTotalPurchasedCredits(user.id);
      const usedCredits = Math.max(0, totalPurchased - remainingCredits);
      
      setAnalysisUsage({
        used: usedCredits,
        total: totalPurchased,
        remaining: remainingCredits,
        isTrial: credits.trial > 0
      });
      
      setError(null);
    } catch (err) {
      console.error('Error in fetchSubscription:', err);
      setError('Failed to load subscription data: ' + (err.message || 'Unknown error'));
      
      // Reset to default values on error
      setAnalysisUsage({
        used: 0,
        total: 0,
        remaining: 0,
        isTrial: false
      });
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);
  
  // Initial fetch and refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [fetchSubscription])
  );
  
  const handleWebViewNav = (navState) => {
    const { url } = navState;
    if (!url) return;
    
    console.log('WebView navigation:', url);
    
    // Handle success/cancel URLs directly in the WebView
    if (url.includes('/payment/success') || url.includes('payment/success')) {
      console.log('Payment successful, closing WebView');
      setShowWebView(false);
      // Refresh subscription data
      fetchSubscription();
      Alert.alert('Success', 'Your purchase was successful!');
    } else if (url.includes('/payment/cancel') || url.includes('payment/cancel')) {
      console.log('Payment cancelled, closing WebView');
      setShowWebView(false);
      Alert.alert('Cancelled', 'Your purchase was cancelled');
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      // The auth state change will handle the navigation
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUnsubscribe = () => {
    Alert.alert(
      'Confirm Unsubscription',
      'Your subscription will remain active until the end of your current billing period. You will not be charged again after this period.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUnsubscribing(true);
              
              const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
                body: { userId: user.id }
              });

              if (error) {
                throw new Error(error.message || 'Failed to cancel subscription');
              }

              // Update local state
              setSubscription(prev => ({
                ...prev,
                cancel_at_period_end: true,
                subscription_status: 'canceled',
                subscription_end_date: data.current_period_end * 1000 // Convert to milliseconds
              }));

              Alert.alert(
                'Subscription Cancelled',
                'Your subscription will remain active until the end of your current billing period.'
              );
            } catch (err) {
              console.error('Error unsubscribing:', err);
              Alert.alert('Error', err.message || 'Failed to process unsubscription. Please try again.');
            } finally {
              setIsUnsubscribing(false);
            }
          },
        },
      ]
    );
  };
  
  // Utility functions moved to utils/profileUtils.js
  
  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // Show WebView when in payment flow
  if (showWebView) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <WebView
          source={{ uri: checkoutUrl }}
          style={styles.webView}
          onNavigationStateChange={handleWebViewNav}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('WebView error:', nativeEvent);
            
            // Ignore navigation errors for success/cancel URLs and our custom domain
            if (nativeEvent.url && 
                (nativeEvent.url.includes('payment/success') || 
                 nativeEvent.url.includes('payment/cancel') ||
                 nativeEvent.url.includes('sprout-app.com'))) {
              console.log('Ignoring navigation error for URL:', nativeEvent.url);
              return;
            }
            
            // Only show error for actual connection issues
            if (nativeEvent.description && (
                nativeEvent.description.includes('Could not connect to the server') ||
                nativeEvent.description.includes('A server with the specified hostname could not be found') ||
                nativeEvent.description.includes('The Internet connection appears to be offline')
            )) {
              console.log('Connection error detected, closing WebView');
              setShowWebView(false);
              Alert.alert('Connection Error', 'Could not connect to the payment server. Please check your internet connection and try again.');
            } else {
              console.log('Non-critical WebView error, ignoring:', nativeEvent.description);
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            // Allow all URLs to load in the WebView
            return true;
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('WebView HTTP error:', nativeEvent);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <ProfileHeader user={user} />
        
        {/* Subscription Status Card */}
        <SubscriptionCard
          subscription={subscription}
          subscriptionLoading={subscriptionLoading}
          error={error}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          user={user}
          onSubscriptionUpdate={(updatedSubscription) => setSubscription(updatedSubscription)}
        />

        {/* Analysis Usage Card */}
        <AnalysisUsageCard
          analysisUsage={analysisUsage}
          subscriptionLoading={subscriptionLoading}
          error={error}
          fetchSubscription={fetchSubscription}
          user={user}
          onPurchase={(result) => {
            if (result && result.checkoutUrl) {
              setCheckoutUrl(result.checkoutUrl);
              setShowWebView(result.showWebView);
            }
          }}
        />
        
        <SignOutButton onSignOut={handleSignOut} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 10,
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#81C784',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Base card header style
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Specific style for analysis usage card header
  analysisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4, // Vertical padding for better alignment of refresh button
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15, // Keep bottom margin for regular card titles
    paddingBottom: 8,
  },
  // Specific style for analysis usage card title
  analysisCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 0, // No bottom margin for analysis card title
    paddingVertical: 4, // Vertical padding for better alignment
  },
  refreshButton: {
    padding: 4,
    marginLeft: 8, // Add some spacing between the title and the button
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisUsageContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  trialText: {
    fontSize: 15,
    color: '#FF9800',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  usageText: {
    fontSize: 16,
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
  },
  detailValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noticeText: {
    marginLeft: 8,
    fontSize: 13,
    flex: 1,
  },
  unsubscribeLink: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    paddingBottom: 24, // Add bottom padding to avoid bottom navigation overlap
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionsContainer: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
  },
  purchaseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  unsubscribeButton: {
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
  },
});
