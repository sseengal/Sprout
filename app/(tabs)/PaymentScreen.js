import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { createStripeCheckoutSession } from '../../lib/stripe';

// NOTE: Stripe India accounts can only accept INR payments unless registered as a business and export-enabled.
const PLAN = {
  id: 'test_plan',
  name: 'Test Plan',
  amount: 100, // Test amount in paise for INR (i.e., ₹1.00)
  currency: 'inr',
};

export default function PaymentScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const startPayment = async () => {
    try {
      setIsLoading(true);
      
      // Retrieve user from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      // Create Stripe checkout session with all required fields
      const checkoutUrl = await createStripeCheckoutSession({
        user_id: user.id,
        user_email: user.email,
        plan_id: PLAN.id,
        plan_name: PLAN.name,
        amount: PLAN.amount,
        currency: PLAN.currency,
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

  // Optionally handle Stripe redirect/cancel URLs here
  const handleWebViewNav = ({ url }) => {
    if (!url) return;
    // Stripe Checkout success/cancel URLs can be handled here if you set them in your Edge Function
    if (url.includes('success')) {
      Alert.alert('Success', 'Payment completed!');
      setShowWebView(false);
    } else if (url.includes('cancel')) {
      Alert.alert('Payment Cancelled', 'The payment was cancelled.');
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
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Payment</Text>
        <Text style={styles.amount}>₹{PLAN.amount / 100} {PLAN.currency}</Text>
        
        <TouchableOpacity
          style={styles.payButton}
          onPress={startPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#4CAF50',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
