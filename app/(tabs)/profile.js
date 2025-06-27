import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { purchaseAnalyses } from '../../lib/analyses';

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
    if (!user) {
      console.log('No user object available');
      return;
    }
    
    try {
      setSubscriptionLoading(true);
      console.log('Fetching subscription data for user:', user);
      
      // Safely extract user ID with fallbacks
      let userId = user?.id;
      
      // Log the raw user ID and its type
      console.log('Raw user ID:', userId, 'Type:', typeof userId);
      
      // Handle different ID formats
      if (userId === null || userId === undefined) {
        console.error('User ID is null or undefined');
        throw new Error('User ID not available');
      }
      
      // If userId is an object, try to extract the UUID
      if (typeof userId === 'object') {
        console.log('User ID is an object, attempting to extract ID:', userId);
        // Try common ID properties that might contain the UUID
        userId = userId.id || userId.user_id || userId.uid || userId.userId || 
                (userId.toString ? userId.toString() : JSON.stringify(userId));
        console.log('Extracted user ID:', userId);
      }
      
      // Ensure it's a string and clean it up
      userId = String(userId).trim();
      
      // If it's a UUID in string format, ensure it's in the correct format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('Invalid UUID format for user ID:', userId);
        throw new Error('Invalid user ID format');
      }
      
      console.log('Using user ID for query:', userId);
      
      // First, try to get the customer data
      console.log('Fetching customer data...');
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (customerError) {
        console.error('Error fetching customer data:', customerError);
        throw customerError;
      }
      
      console.log('Customer data:', customerData);
      setSubscription(customerData || null);
      
      // Then, get the analysis purchases
      console.log('Fetching analysis purchases...');
      const { data: purchases, error: purchaseError } = await supabase
        .from('analysis_purchases')
        .select('quantity, used_count, expires_at, created_at')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString());
      
      if (purchaseError) {
        console.error('Error fetching analysis purchases:', purchaseError);
        return [];
      }
      
      if (!purchases || purchases.length === 0) {
        console.log('No active analysis purchases found for user');
        return [];
      }
      
      console.log('Found analysis purchases:', purchases);
      
      // Filter out purchases where all analyses have been used
      const activePurchases = purchases.filter(purchase => {
        const remaining = purchase.quantity - (purchase.used_count || 0);
        return remaining > 0;
      });
      
      console.log('Active purchases with remaining analyses:', activePurchases);
      
      // Calculate total available analyses from active purchases
      const totalAnalyses = activePurchases.reduce((sum, p) => {
        const available = p.quantity - (p.used_count || 0);
        console.log(`Purchase: ${p.quantity} total, ${p.used_count || 0} used, ${available} available`);
        return sum + available;
      }, 0);
      
      console.log('Total analyses available:', totalAnalyses);
      
      // Get used analyses count (all time)
      console.log('Fetching used analyses count for user:', userId);
      const { count: usedAnalyses = 0, error: usageError } = await supabase
        .from('plant_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        throw usageError;
      }
      
      console.log('Used analyses count:', usedAnalyses);
      
      // Determine if user is on trial
      const isTrial = customerData?.trial_end_date && 
                     new Date(customerData.trial_end_date) > new Date();
      
      console.log('Trial status:', { 
        hasTrialEndDate: !!customerData?.trial_end_date,
        trialEndDate: customerData?.trial_end_date,
        isTrial,
        now: new Date().toISOString()
      });
      
      // If on trial, add trial analyses
      const totalWithTrial = isTrial ? totalAnalyses + 5 : totalAnalyses;
      
      const usageData = {
        used: usedAnalyses || 0,
        total: totalWithTrial,
        remaining: Math.max(0, totalWithTrial - (usedAnalyses || 0)),
        isTrial
      };
      
      console.log('Setting analysis usage data:', usageData);
      setAnalysisUsage(usageData);
      
      setError(null);
    } catch (err) {
      console.error('Error in fetchSubscription:', err);
      setError('Failed to load subscription data: ' + (err.message || 'Unknown error'));
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);
  
  // Initial fetch
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);
  
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
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'trialing':
        return '#2196F3';
      case 'past_due':
      case 'unpaid':
        return '#F44336';
      case 'canceled':
        return '#9E9E9E';
      default:
        return '#757575';
    }
  };
  
  const getTrialDaysRemaining = (trialEndDate) => {
    if (!trialEndDate) return 0;
    const end = new Date(trialEndDate).getTime();
    const now = new Date().getTime();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  const getStatusText = (status, trialEndDate) => {
    if (!status) return 'Inactive';
    
    // Format the status text
    let statusText = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    
    // Add trial days remaining if in trial
    if (status === 'trialing' && trialEndDate) {
      const daysLeft = getTrialDaysRemaining(trialEndDate);
      statusText += ` - ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
    }
    
    return statusText;
  };
  
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
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={60} color="#fff" />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          
          {user?.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>
        
        {/* Subscription Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription Status</Text>
          
          {subscriptionLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading subscription details...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={24} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View 
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(subscription?.subscription_status) + '1A' }
                  ]}
                >
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(subscription?.subscription_status) }
                  ]}>
                    {getStatusText(subscription?.subscription_status, subscription?.trial_end_date)}
                  </Text>
                </View>
              </View>
              
              {subscription?.next_billing_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Next bill date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(subscription.next_billing_date)}
                  </Text>
                </View>
              )}
              
              {subscription?.subscription_start_date && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Member Since:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(subscription.subscription_start_date)}
                  </Text>
                </View>
              )}
              
              <View style={styles.actionsContainer}>
                {subscription?.cancel_at_period_end ? (
                  <View style={[styles.noticeContainer, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialIcons name="info-outline" size={18} color="#FF9800" />
                    <Text style={[styles.noticeText, { color: '#E65100' }]}>
                      Your subscription will end on {formatDate(subscription.subscription_end_date)}
                    </Text>
                  </View>
                ) : subscription?.subscription_status === 'active' && (
                  <TouchableOpacity 
                    onPress={handleUnsubscribe}
                    disabled={isUnsubscribing}
                    style={styles.unsubscribeButton}
                  >
                    {isUnsubscribing ? (
                      <ActivityIndicator size="small" color="#F44336" />
                    ) : (
                      <Text style={styles.unsubscribeButtonText}>Cancel Subscription</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Analysis Usage Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analysis Usage</Text>
          {subscriptionLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading usage data...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={24} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              {analysisUsage.isTrial ? (
                <Text style={styles.trialText}>
                  You're on a trial with {analysisUsage.total} analyses included
                </Text>
              ) : (
                <Text style={styles.usageText}>
                  {analysisUsage.remaining} of {analysisUsage.total} analyses remaining this month
                </Text>
              )}
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(100, (analysisUsage.used / analysisUsage.total) * 100)}%`,
                      backgroundColor: analysisUsage.isTrial ? '#FFC107' : '#4CAF50'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.usageDetail}>
                {analysisUsage.used} analyses used • {analysisUsage.remaining} remaining
              </Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.purchaseButton, { marginTop: 20 }]}
                onPress={async () => {
                  try {
                    setIsPurchasing(true);
                    const { url } = await purchaseAnalyses(user.id);
                    if (url) {
                      setCheckoutUrl(url);
                      setShowWebView(true);
                    }
                  } catch (err) {
                    console.error('Purchase error:', err);
                    Alert.alert(
                      'Purchase Error', 
                      err.message || 'Failed to start purchase. Please try again.'
                    );
                  } finally {
                    setIsPurchasing(false);
                  }
                }}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Buy More Analyses</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
        
        <View style={[styles.card, { paddingVertical: 0, paddingHorizontal: 0, marginBottom: 24 }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { padding: 20 }]}
            onPress={handleSignOut}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="logout" size={24} color="#E53935" />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Sign Out</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    paddingVertical: 6,
    borderRadius: 16,
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
    marginTop: 16,
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
