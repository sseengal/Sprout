import * as Linking from 'expo-linking';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SavedPlantsProvider } from '../contexts/SavedPlantsContext';
import { ReminderProvider } from '../contexts/ReminderContext';
import * as NotificationService from '../services/notificationService';
import { toastConfig } from '../components/common/ToastConfig';

// Create a simple logger
const createLogger = (component) => {
  return (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [${component}]`;
    console.log(message, ...args);
  };
};

// This component handles the deep linking for auth callbacks and auth state
function AuthLayout() {
  // Create a stable component instance ID
  const instanceId = useMemo(() => `AuthLayout-${Math.random().toString(36).substr(2, 9)}`, []);
  const logger = useMemo(() => createLogger(instanceId), [instanceId]);
  
  const { user, loading, error, handleAuthCallback } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const navigationInProgress = useRef(false);
  const initialUrlProcessed = useRef(false);
  const mountCount = useRef(0);

  const isMounted = useRef(true);

  // Log component mount/unmount
  useEffect(() => {
    mountCount.current += 1;
    const currentMount = mountCount.current;
    isMounted.current = true;
    logger(`Mounted (mount #${currentMount})`, { 
      pathname, 
      segments, 
      user: user ? 'authenticated' : 'not authenticated' 
    });
    
    return () => {
      isMounted.current = false;
      logger(`Unmounting (was mount #${currentMount})`);
    };
  }, [logger, pathname, segments, user]);

  // Check if the current route is in the auth group
  const isInAuthGroup = segments[0] === '(auth)';
  // Check if the current route is the email confirmation screen - check both possible paths
  const isEmailConfirmationScreen = pathname === '/(auth)/email-confirmation' || pathname.includes('/email-confirmation');

  // Handle payment deep links
  const handlePaymentLink = useCallback(async (url) => {
    try {
      if (url.includes('payment/success')) {
        Alert.alert('Success', 'Your purchase was successful!');
        // Refresh subscription data if user is logged in
        if (user?.id) {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .single();
          if (data) setSubscription(data);
        }
      } else if (url.includes('payment/cancel')) {
        Alert.alert('Cancelled', 'Your purchase was cancelled.');
      }
    } catch (error) {
      logger('Error handling payment link:', error);
    }
  }, [user?.id]);

  // Handle deep links
  const handleDeepLink = useCallback(async (event) => {
    if (!event?.url || !isMounted.current) return;
    
    const url = event.url;
    logger('Deep link received:', { url });
    
    // Skip base URLs
    if (url.startsWith('exp://') && (url.endsWith(':8081') || url.includes(':8081/'))) {
      logger('Skipping base URL:', { url });
      return;
    }

    try {
      if (url.includes('auth/callback') || url.includes('access_token') || url.includes('error=')) {
        await handleAuthCallback(url);
      } else if (url.includes('payment/')) {
        await handlePaymentLink(url);
      }
    } catch (error) {
      logger('Error handling deep link:', error);
    }
  }, [handleAuthCallback, handlePaymentLink, logger]);

  // Set up deep linking
  useEffect(() => {
    if (!isMounted.current) return;
    
    logger('Setting up deep linking');
    
    // Add event listener for incoming links
    const handleUrl = (event) => {
      if (!isMounted.current) return;
      logger('Received URL event:', event);
      handleDeepLink(event);
    };
    
    const subscription = Linking.addEventListener('url', handleUrl);
    logger('Added deep link listener');

    // Process initial URL only once
    if (!initialUrlProcessed.current) {
      initialUrlProcessed.current = true;
      logger('Processing initial URL');
      
      Linking.getInitialURL()
        .then(url => {
          if (!isMounted.current) return;
          
          if (url) {
            logger('Processing initial URL:', { url });
            // Skip base URLs for initial URL processing
            if (!(url.startsWith('exp://') && (url.endsWith(':8081') || url.includes(':8081/')))) {
              logger('Handling initial URL as deep link');
              handleDeepLink({ url });
            } else {
              logger('Skipping base URL in initial URL processing');
            }
          } else {
            logger('No initial URL found');
          }
        })
        .catch(error => {
          if (isMounted.current) {
            logger('Error getting initial URL:', error);
          }
        });
    }

    // Cleanup function
    return () => {
      if (isMounted.current) {
        logger('Cleaning up deep link listener');
      }
      if (subscription?.remove) {
        subscription.remove();
        if (isMounted.current) {
          logger('Removed deep link listener');
        }
      }
    };
  }, [handleDeepLink, logger]);

  // Check if a URL is a base URL that should be ignored
  const shouldIgnoreUrl = useCallback((url) => {
    if (!url) return true;
    // Match any URL that's just the base URL (with or without trailing slash)
    return /^exp:\/\/192\.168\.1\.36:8082\/?$/.test(url);
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isMounted.current) return;
    logger('NAV CHECK', { pathname, segments, user, loading });
    
    // Skip navigation if we're in the middle of an auth operation
    if (pathname === '/(auth)' && pathname.includes('error=')) {
      logger('Auth error detected, skipping navigation');
      return;
    }
    
    if (loading) {
      logger('Auth state loading, skipping navigation');
      return;
    }
    
    if (navigationInProgress.current) {
      logger('Navigation already in progress, skipping');
      return;
    }

    const navigate = async (route) => {
      if (!isMounted.current) return;
      if (pathname === route) {
        logger(`Already at target route: ${route}`);
        return;
      }
      try {
        navigationInProgress.current = true;
        logger(`Navigating to: ${route}`);
        await router.replace(route);
      } catch (error) {
        logger('Navigation error:', error);
      } finally {
        setTimeout(() => {
          if (isMounted.current) navigationInProgress.current = false;
        }, 100);
      }
    };

    // Add debug logs for redirect logic
    const firstSegment = segments[0];
    logger('REDIRECT CHECK', { pathname, segments, firstSegment, error });
    if (!user) {
      // Only suppress redirect if on (auth), '/(auth)', or root with no segments, and error is present
      if (((firstSegment === '(auth)') || pathname === '/(auth)' || (pathname === '/' && segments.length === 0)) && error) {
        logger('On auth route or root with error, not redirecting');
        return;
      }
      // On any other route, always redirect to /(auth) if user is null
      logger('User is not signed in and not in auth group, redirecting to /(auth)', { pathname, segments });
      navigate('/(auth)');
      return;
    } else {
      // Don't redirect away from email confirmation screen even if user is signed in
      if (pathname === '/(auth)/email-confirmation' || pathname.includes('/email-confirmation')) {
        logger('On email confirmation screen, not redirecting', { pathname });
        return;
      }
      
      if (firstSegment === '(auth)') {
        // Skip navigation if we're in the process of signing up
        if (pathname === '/(auth)' && sessionStorage?.getItem('isSigningUp') === 'true') {
          logger('In sign-up process, not redirecting', { pathname });
          return;
        }
        
        logger('User is signed in and in auth group, redirecting to app', { pathname, segments });
        navigate('/(tabs)');
        return;
      }
    }
  }, [user, loading, segments, isEmailConfirmationScreen, router, pathname, logger]);

  // Show loading indicator while initializing
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }
  
  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="reminders" options={{ headerShown: true }}/>
    </Stack>
  );
}

// Setup notification channels for Android
async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('plant-care-reminders', {
      name: 'Plant Care Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
    });
  }
}

// Notification initialization wrapper component
function NotificationInitializer({ children }) {
  const logger = useMemo(() => createLogger('NotificationInitializer'), []);
  
  useEffect(() => {
    // Initialize notifications when the app starts
    const initializeNotifications = async () => {
      try {
        logger('Initializing notifications');
        
        // Set up Android notification channels
        await setupNotificationChannels();
        
        // Request notification permissions
        const hasPermission = await NotificationService.requestNotificationPermissions();
        logger(`Notification permissions ${hasPermission ? 'granted' : 'denied'}`);
      } catch (error) {
        logger('Error initializing notifications:', error);
      }
    };
    
    initializeNotifications();
  }, [logger]);
  
  return children;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SavedPlantsProvider>
        <ReminderProvider>
          <NotificationInitializer>
            <AuthLayout />
            <Toast config={toastConfig} />
          </NotificationInitializer>
        </ReminderProvider>
      </SavedPlantsProvider>
    </AuthProvider>
  );
}
