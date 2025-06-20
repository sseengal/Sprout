import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { createStripeCheckoutSession } from '../../lib/stripe';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = width - (CARD_MARGIN * 3);

// Subscription plans
const PLANS = {
  monthly: {
    id: 'price_monthly',
    name: 'Monthly',
    amount: 10000, // ₹100.00 in paise
    currency: 'inr',
    interval: 'month',
    features: [
      'Unlimited access to all features',
      'Cancel anytime',
      '24/7 customer support'
    ]
  },
  yearly: {
    id: 'price_yearly',
    name: 'Yearly',
    amount: 96000, // ₹960.00 in paise (20% off)
    currency: 'inr',
    interval: 'year',
    features: [
      'Everything in Monthly',
      '2 months free',
      'Priority support',
      'Save 20%'
    ]
  }
};

export default function PaymentScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const startPayment = async () => {
    try {
      setIsLoading(true);
      const plan = PLANS[selectedPlan];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to continue');
      
      const checkoutUrl = await createStripeCheckoutSession({
        user_id: user.id,
        user_email: user.email,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
      }, supabase);
      
      setCheckoutUrl(checkoutUrl);
      setShowWebView(true);
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Failed to start payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebViewNav = ({ url }) => {
    if (!url) return;
    if (url.includes('success')) {
      Alert.alert('Success', 'Subscription activated successfully!');
      setShowWebView(false);
    } else if (url.includes('cancel')) {
      setShowWebView(false);
    }
  };

  if (showWebView) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        style={styles.webView}
        onNavigationStateChange={handleWebViewNav}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        )}
      />
    );
  }

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const PlanCard = ({ planKey, isSelected }) => {
    const plan = PLANS[planKey];
    const isYearly = planKey === 'yearly';
    
    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isYearly && styles.popularPlan
        ]}
        onPress={() => setSelectedPlan(planKey)}
        activeOpacity={0.8}
      >
        {isYearly && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>
        )}
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>
          {formatPrice(plan.amount)}
          <Text style={styles.planInterval}>/{plan.interval}</Text>
        </Text>
        {isYearly && (
          <Text style={styles.discountText}>Save 20% vs monthly</Text>
        )}
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#6366f1" style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>Select the plan that works best for you</Text>
        </View>
        
        <View style={styles.plansContainer}>
          <PlanCard planKey="monthly" isSelected={selectedPlan === 'monthly'} />
          <PlanCard planKey="yearly" isSelected={selectedPlan === 'yearly'} />
        </View>
        
        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]}
          onPress={startPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe {selectedPlan === 'yearly' ? 'Annually' : 'Monthly'}
            </Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.note}>
          You can cancel your subscription anytime. Payment will be charged to your payment method at confirmation of purchase.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  plansContainer: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: '#6366f1',
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  popularPlan: {
    borderTopWidth: 3,
    borderTopColor: '#6366f1',
    paddingTop: 28,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  planInterval: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  discountText: {
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresContainer: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  subscribeButton: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
