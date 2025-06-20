import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch subscription data
  useEffect(() => {
    if (!user) return;
    
    const fetchSubscription = async () => {
      try {
        setSubscriptionLoading(true);
        const { data, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (fetchError) throw fetchError;
        
        setSubscription(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to load subscription data');
      } finally {
        setSubscriptionLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user]);
  
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
              // TODO: Implement actual unsubscribe API call
              console.log('Unsubscribing...');
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
              console.error('Error unsubscribing:', err);
              Alert.alert('Error', 'Failed to process unsubscription. Please try again.');
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
  
  const getStatusText = (status) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Inactive';
  };
  
  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
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
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(subscription?.subscription_status) + '1A' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(subscription?.subscription_status) }
                  ]}>
                    {getStatusText(subscription?.subscription_status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan:</Text>
                <Text style={styles.detailValue}>
                  {subscription?.plan_type ? 
                    subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1) : 
                    'No active plan'}
                </Text>
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
                >
                  {isUnsubscribing ? (
                    <ActivityIndicator size="small" color="#F44336" />
                  ) : (
                    <Text style={styles.unsubscribeLink}>Unsubscribe</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        

        
        <View style={styles.menu}>
          <TouchableOpacity 
            style={styles.menuItem}
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
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
  },
});
