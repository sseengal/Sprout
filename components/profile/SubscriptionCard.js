import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SubscriptionCard({ 
  subscription, 
  subscriptionLoading, 
  error, 
  formatDate,
  getStatusColor,
  getStatusText,
  user,
  onSubscriptionUpdate
}) {
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

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

              // Update subscription data
              const updatedSubscription = {
                ...subscription,
                cancel_at_period_end: true,
                subscription_status: 'canceled',
                subscription_end_date: data.current_period_end * 1000 // Convert to milliseconds
              };
              
              // Notify parent component of the update
              if (onSubscriptionUpdate) {
                onSubscriptionUpdate(updatedSubscription);
              }

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

  return (
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
                { 
                  backgroundColor: getStatusColor(subscription?.subscription_status) + '1A',
                  borderColor: getStatusColor(subscription?.subscription_status)
                }
              ]}
            >
              <Text style={[
                styles.statusText,
                { color: getStatusColor(subscription?.subscription_status) }
              ]}>
                {subscription?.cancel_at_period_end 
                  ? 'Active (Ending Soon)' 
                  : getStatusText(subscription?.subscription_status, subscription?.trial_end_date)
                }
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
                  <Text style={styles.unsubscribeLink}>Cancel Subscription</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#333',
    marginBottom: 15,
    paddingBottom: 8,
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
  unsubscribeButton: {
    alignItems: 'center',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 12,
  },
});
