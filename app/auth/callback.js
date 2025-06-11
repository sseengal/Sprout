import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling auth callback...');
        
        // Get the full URL
        const url = new URL(window.location.href);
        console.log('Callback URL:', url.toString());
        
        // Extract tokens from URL hash or query parameters
        const hash = url.hash.substring(1);
        const searchParams = new URLSearchParams(hash || url.search);
        
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        
        console.log('Extracted tokens - Access Token:', !!accessToken, 'Refresh Token:', !!refreshToken);
        
        if (error) {
          console.error('OAuth error:', error, searchParams.get('error_description'));
          setError(`Authentication failed: ${error}. ${searchParams.get('error_description') || ''}`);
          return;
        }

        if (accessToken && refreshToken) {
          try {
            console.log('Setting session with tokens...');
            
            // Set the session with the tokens from the URL
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              throw sessionError;
            }

            console.log('Session set successfully:', session);

            if (session) {
              // Successfully signed in, redirect to home
              console.log('Authentication successful, redirecting to home...');
              router.replace('/(tabs)');
              return;
            } else {
              throw new Error('No session data received');
            }
          } catch (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }
        } else {
          // If we get here, something went wrong with the OAuth flow
          console.error('Missing tokens in auth response');
          setError('Failed to sign in. Missing authentication tokens.');
        }
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.replace('/');
        }, 3000);
        
      } catch (error) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'An error occurred during sign in');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.replace('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.redirectText}>Redirecting to login...</Text>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#2E7D32" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  redirectText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
});
