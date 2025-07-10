import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { purchaseAnalyses } from '../../lib/analyses';

export default function AnalysisUsageCard({ 
  analysisUsage, 
  subscriptionLoading, 
  error, 
  fetchSubscription,
  user,
  onPurchase
}) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.analysisCardHeader}>
        <Text style={styles.analysisCardTitle}>Analysis Usage</Text>
        <TouchableOpacity 
          onPress={fetchSubscription}
          disabled={subscriptionLoading}
          style={styles.refreshButton}
        >
          <MaterialIcons 
            name="refresh" 
            size={20} 
            color="#4CAF50"
            style={subscriptionLoading ? { opacity: 0.5 } : null}
          />
        </TouchableOpacity>
      </View>
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
                if (url && onPurchase) {
                  onPurchase({ checkoutUrl: url, showWebView: true });
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
  analysisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  analysisCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 0,
    paddingVertical: 4,
  },
  refreshButton: {
    padding: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
});
