import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

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
      
      // Get the redirect URL based on the environment
      let redirectUrl = '';
      
      if (Platform.OS === 'web') {
        // For web, use the current origin + /auth/callback
        redirectUrl = `${window.location.origin}/auth/callback`;
      } else if (__DEV__) {
        // For development, use the Expo AuthSession proxy URL with correct owner and slug
        const Constants = require('expo-constants').default;
        const expoOwner = (Constants?.manifest?.owner) || (Constants?.expoConfig?.owner) || 'sseengal';
        const expoSlug = (Constants?.manifest?.slug) || (Constants?.expoConfig?.slug) || 'sprout-plant-care';
        redirectUrl = `https://auth.expo.io/@${expoOwner}/${expoSlug}`;
      } else {
        // For production, use the custom scheme
        redirectUrl = 'sprout://auth/callback';
      }
      
      console.log('Initiating Google OAuth flow...');
      console.log('Using redirect URL:', redirectUrl);
      
      // Start the OAuth flow
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We'll handle the browser redirect manually
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (authError) {
        console.error('Error getting OAuth URL:', authError);
        throw authError;
      }
      
      if (!data?.url) {
        throw new Error('No authentication URL received from the server');
      }
      
      console.log('Opening browser for authentication...');
      
      // Open the browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: true,
          createTask: false, // This prevents the app from being closed on Android
        }
      );
      
      console.log('Auth session result:', result);
      
      // Handle the result of the authentication
      if (result.type === 'success') {
        // The URL will be handled by the deep linking setup in _layout.js
        console.log('Authentication successful, handling callback...');
        
        // If we have a URL, try to handle it with the auth callback
        if (result.url) {
          console.log('Handling auth callback with URL:', result.url);
          await handleAuthCallback(result.url);
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled the authentication');
        setError('Authentication was cancelled');
      } else {
        console.log('Authentication failed with type:', result.type);
        setError('Authentication failed');
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
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      // Navigate to the login screen after sign out
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error.message || 'An error occurred while signing out');
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  const handleAuthCallback = async (url) => {
    if (!url) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Handling auth callback with URL:', url);
      
      // Check if this is an OAuth callback URL from the redirect
      if (url.includes('access_token') || url.includes('error=') || url.includes('type=signin')) {
        // This is an OAuth callback URL, extract tokens from URL
        console.log('Processing OAuth callback URL...');
        
        // For Expo AuthSession, we need to handle the URL with the expo-auth-session params
        if (url.includes('expo-auth-session')) {
          // This is coming from Expo AuthSession, we need to parse it differently
          const params = new URLSearchParams(new URL(url).search);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const error = params.get('error');
          
          if (error) {
            throw new Error(`OAuth error: ${error}. ${params.get('error_description') || ''}`);
          }
          
          if (!accessToken || !refreshToken) {
            // Try to get the session directly
            console.log('No tokens in URL, trying to get session...');
            const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !newSession) {
              throw new Error('No valid session found after OAuth flow');
            }
            
            // Get the user data
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (!currentUser) {
              throw new Error('No user data available after authentication');
            }
            
            setUser(currentUser);
            setSession(newSession);
            router.replace('/(tabs)');
            return;
          }
          
          // If we have tokens, set the session
          console.log('Setting session with tokens from URL...');
          const { data: { session: newSession }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          
          console.log('Session set successfully from URL');
          
          // Get the user data
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (!currentUser) {
            throw new Error('No user data available after authentication');
          }
          
          setUser(currentUser);
          setSession(newSession);
          router.replace('/(tabs)');
        } else {
          // Handle standard OAuth callback
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const error = params.get('error');
          
          if (error) {
            throw new Error(`OAuth error: ${error}. ${params.get('error_description') || ''}`);
          }
          
          if (!accessToken || !refreshToken) {
            throw new Error('No access token or refresh token found in the URL');
          }
          
          console.log('Setting session with tokens from URL...');
          
          // Set the session with the tokens from the URL
          const { data: { session: newSession }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          
          console.log('Session set successfully from URL');
          
          // Get the user data
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (!currentUser) {
            throw new Error('No user data available after authentication');
          }
          
          setUser(currentUser);
          setSession(newSession);
          router.replace('/(tabs)');
        }
      } else if (url.includes('auth/callback')) {
        // This is a callback URL that might be from a custom scheme
        console.log('Handling custom scheme callback...');
        
        // Try to get the session from the URL
        const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session from URL:', sessionError);
          throw sessionError;
        }
        
        if (newSession) {
          // We have a valid session
          console.log('Got valid session from URL callback');
          setSession(newSession);
          
          // Get the user data
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            setUser(currentUser);
            // Navigate to home after successful login
            router.replace('/(tabs)');
          } else {
            throw new Error('No user data available after authentication');
          }
        } else {
          throw new Error('No session found in the callback URL');
        }
      } else {
        console.log('Not an OAuth callback URL, ignoring...');
      }
      
    } catch (error) {
      console.error('Error in handleAuthCallback:', error);
      setError(error.message || 'An error occurred during authentication');
      // Navigate to login on error
      router.replace('/');
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
    handleGoogleSignIn,
    signIn: handleGoogleSignIn, // Keep for backward compatibility
    signOut: handleSignOut,
    handleAuthCallback,
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
