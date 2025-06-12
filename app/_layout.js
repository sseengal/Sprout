import { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as Linking from 'expo-linking';

// This component handles the deep linking for auth callbacks
function AuthLayout() {
  const { handleAuthCallback } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
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
