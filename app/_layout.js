import * as Linking from 'expo-linking';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

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
  
  const { user, loading, handleAuthCallback } = useAuth();
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
  // Check if the current route is the email confirmation screen
  const isEmailConfirmationScreen = pathname === '/email-confirmation';

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
      }
    } catch (error) {
      logger('Error handling deep link:', error);
    }
  }, [handleAuthCallback, logger]);

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

    // Robust navigation: if not authenticated and not in (auth), always go to '/(auth)'
    const firstSegment = segments[0];
    if (!user) {
      if (firstSegment !== '(auth)') {
        logger('User is not signed in and not in auth group, redirecting to /(auth)', { pathname, segments });
        navigate('/(auth)');
        return;
      }
    } else {
      if (firstSegment === '(auth)' && !isEmailConfirmationScreen) {
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
      <Stack.Screen name="email-confirmation" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthLayout />
    </AuthProvider>
  );
}
