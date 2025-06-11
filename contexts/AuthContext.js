import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signInWithGoogle } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Create the auth context
export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check active sessions and sets the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Sign in with Google
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, warm up the browser to make the auth flow faster
      if (WebBrowser.warmUpAsync) {
        await WebBrowser.warmUpAsync();
      }

      console.log('Initiating Google OAuth flow...');
      
      // Generate the redirect URL for the current platform
      const redirectUrl = Linking.createURL('auth/callback');
      console.log('Using redirect URL:', redirectUrl);
      
      // Start the OAuth flow using the helper function from supabase.js
      const response = await signInWithGoogle(redirectUrl);
      console.log('Sign in response:', response);

      if (!response || !response.url) {
        const errorMsg = 'No authentication URL received from the server';
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const { url } = response;
      console.log('OAuth URL:', url);

      // If we're on web, we need to handle the redirect manually
      if (Platform.OS === 'web') {
        console.log('Redirecting to:', url);
        window.location.href = url;
        return;
      }

      // For native, open the URL in the browser
      if (url) {
        try {
          // Open the auth session
          console.log('Opening WebBrowser with URL:', url);
          const result = await WebBrowser.openAuthSessionAsync(
            url,
            redirectUrl,
            { 
              showInRecents: true,
              // This is important for iOS to handle the redirect back to the app
              dismissButtonStyle: 'cancel',
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
            }
          );

          console.log('WebBrowser result:', result);

          // Dismiss the auth browser
          if (WebBrowser.dismiss) {
            await WebBrowser.dismiss();
          }

          if (result.type === 'success') {
            console.log('Auth successful, processing response...');
            
            // The URL will contain the access token and refresh token
            const responseUrl = result.url;
            console.log('Auth response URL:', responseUrl);
            
            // Parse the URL to extract the tokens
            const urlObj = new URL(responseUrl);
            const hash = urlObj.hash.substring(1); // Remove the '#'
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            console.log('Extracted tokens - Access Token:', !!accessToken, 'Refresh Token:', !!refreshToken);
            
            if (accessToken && refreshToken) {
              try {
                // Set the session manually
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (sessionError) {
                  console.error('Session error:', sessionError);
                  setError(sessionError.message);
                  return;
                }
                
                console.log('Session data:', sessionData);
                
                // Update the user state
                setUser(sessionData?.user || null);
                setSession(sessionData);
                
                // Navigate to the home screen
                if (router) {
                  router.replace('/(tabs)');
                }
              } catch (sessionError) {
                console.error('Error setting session:', sessionError);
                setError(sessionError.message);
              }
            } else {
              const errorMsg = 'Failed to extract tokens from the authentication response';
              console.error(errorMsg);
              setError(errorMsg);
            }
          } else if (result.type === 'cancel') {
            console.log('User cancelled the authentication');
            setError('Authentication was cancelled');
          } else {
            const errorMsg = `Authentication failed with type: ${result.type}`;
            console.error(errorMsg);
            setError(errorMsg);
          }
        } catch (browserError) {
          console.error('Error during browser authentication:', browserError);
          setError(browserError.message);
        }
      } else {
        const errorMsg = 'No authentication URL received';
        console.error(errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error.message);
    } finally {
      // Ensure loading is always set to false
      setLoading(false);
      
      // Cool down the browser if needed
      if (WebBrowser.coolDownAsync) {
        await WebBrowser.coolDownAsync();
      }
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create the context value
  const value = {
    user,
    session,
    loading,
    error,
    signInWithGoogle: handleGoogleSignIn,
    signOut: async () => {
      try {
        setLoading(true);
        setError(null);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        setUser(null);
        setSession(null);
        if (router) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error signing out:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    },
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
