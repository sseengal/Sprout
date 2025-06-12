import { useEffect, useState } from 'react';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as Linking from 'expo-linking';
import { ActivityIndicator, View } from 'react-native';

// This component handles the deep linking for auth callbacks and auth state
function AuthLayout() {
  const { user, loading, handleAuthCallback } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);
  
  // Check if the current route is in the auth group
  const isInAuthGroup = segments[0] === '(auth)';
  
  // Check if the current route is the email confirmation screen
  const isEmailConfirmationScreen = pathname === '/email-confirmation';
  
  // Check if the current route is the root screen (login/signup)
  const isRootScreen = pathname === '/';

  useEffect(() => {
    // Handle deep links when the app is launched from a URL
    const handleDeepLink = async (event) => {
      const url = event?.url || (await Linking.getInitialURL());
      if (url) {
        console.log('App opened with URL:', url);
        await handleAuthCallback(url);
      }
    };

    // Add event listener for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if the app was opened with a URL
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App was opened with URL:', url);
        handleAuthCallback(url);
      }
    }).catch(console.error);

    // Clean up the event listener
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [handleAuthCallback]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    
    // If we're still loading, don't do anything
    if (loading) return;
    
    // If user is signed in and is in the auth group, redirect to home
    if (user && isInAuthGroup) {
      router.replace('/(tabs)');
    } 
    // If user is not signed in and is not in the auth group, redirect to login
    else if (!user && !isInAuthGroup && !isEmailConfirmationScreen) {
      router.replace('/');
    }
  }, [user, loading, isInAuthGroup, isEmailConfirmationScreen, initialized]);
  
  // Show loading indicator while initializing
  if (loading && !initialized) {
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
