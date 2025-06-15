import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar, 
  Modal, 
  Animated, 
  Easing,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentScreen() {
  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const webViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Using the test payment link from Razorpay dashboard
  const paymentUrl = 'https://rzp.io/rzp/MmuwUsA';

  const handleBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      setShowWebView(false);
    }
  };

  const handleNavigationStateChange = (navState) => {
    console.log('Navigation state changed:', navState);
    const { url, loading, title } = navState;
    
    // Update loading state
    setIsLoading(loading);
    
    // Log URL changes for debugging
    if (url) {
      console.log('Current URL:', url);
    }
    
    // Handle payment completion
    if (url && (url.includes('thankyou') || url.includes('success'))) {
      console.log('Payment successful, showing success screen');
      setShowWebView(false);
      setShowSuccess(true);
      triggerConfetti();
    } else if (url && (url.includes('failed') || url.includes('cancel'))) {
      console.log('Payment failed or cancelled');
      setShowWebView(false);
      setShowError(true);
    }
  };

  const triggerConfetti = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  };

  const renderWebView = () => (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ 
              uri: paymentUrl,
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
              }
            }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => {
              console.log('WebView load started');
              setIsLoading(true);
            }}
            onLoadEnd={() => {
              console.log('WebView load finished');
              setIsLoading(false);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setIsLoading(false);
              setShowError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent.statusCode);
            }}
            sharedCookiesEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsBackForwardNavigationGestures={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading payment gateway...</Text>
              </View>
            )}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading payment gateway...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );

  const renderSuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccess}
      onRequestClose={() => setShowSuccess(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.modalTitle}>Payment Successful!</Text>
          <Text style={styles.modalText}>Thank you for subscribing to Sprout Premium.</Text>
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => setShowSuccess(false)}
          >
            <Text style={styles.modalButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderErrorModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showError}
      onRequestClose={() => setShowError(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={60} color="#f44336" />
          </View>
          <Text style={styles.modalTitle}>Payment Incomplete</Text>
          <Text style={styles.modalText}>
            Your payment was not completed. Please try again or contact support if the issue persists.
          </Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowError(false)}
            >
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.retryButton]}
              onPress={() => {
                setShowError(false);
                setShowWebView(true);
              }}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
          
          <Text style={styles.title}>Upgrade to Premium</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹100</Text>
            <Text style={styles.duration}>/month</Text>
          </View>
          
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Unlimited plant identifications</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Ad-free experience</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Priority support</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Exclusive plant care tips</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.subscribeButton}
            onPress={() => setShowWebView(true)}
            activeOpacity={0.9}
          >
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
          
          <Text style={styles.note}>
            You'll be redirected to a secure payment page powered by Razorpay
          </Text>
        </View>
        
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color="#666" />
          <Text style={styles.securityText}>Secure & encrypted payment</Text>
        </View>
      </View>
      
      {showWebView && renderWebView()}
      {renderSuccessModal()}
      {renderErrorModal()}
      
      {/* Confetti Effect */}
      {showSuccess && (
        <Animated.View 
          style={[
            styles.confettiContainer,
            { opacity: fadeAnim }
          ]}
          pointerEvents="none"
        >
          {[...Array(20)].map((_, i) => (
            <View 
              key={i}
              style={[
                styles.confetti,
                {
                  backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%}`,
                  left: `${Math.random() * 100}%`,
                  transform: [
                    { rotate: `${Math.random() * 360}deg` },
                    { translateY: Math.random() * 1000 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Base styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  premiumBadgeText: {
    color: '#4CAF50',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#4CAF50',
  },
  duration: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  securityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  
  // WebView styles
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
  },
  
  // Confetti styles
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: 'red',
    top: -50,
  },
});
