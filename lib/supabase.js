// Import URL polyfill for React Native
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('Missing or invalid Supabase URL or Anon Key in environment variables');
}

// Get the correct redirect URL based on platform
// Helper to detect if running in Expo Go
const isExpoGo = () => {
  // In Expo Go, app ownership is 'expo'
  return (typeof Constants !== 'undefined' && Constants.appOwnership === 'expo');
};

const getRedirectUrl = () => {
  if (Platform.OS === 'web') {
    return window.location.origin + '/auth/callback';
  }
  // Use Expo AuthSession proxy for Expo Go/dev
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_AUTH_PROXY_URL) {
    return process.env.EXPO_PUBLIC_AUTH_PROXY_URL;
  }
  // Fallback for Expo Go if env not set
  if (typeof global !== 'undefined' && global.Expo && global.Expo.Constants && global.Expo.Constants.linkingUri) {
    return global.Expo.Constants.linkingUri;
  }
  // For standalone/prod builds, use custom scheme
  return 'sprout://auth/callback';
};

export const redirectUrl = getRedirectUrl();

// Create the Supabase client with the correct storage and auth settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Function to handle OAuth sign in
export const signInWithOAuth = async (provider, customRedirectUrl = null) => {
  try {
    const finalRedirectUrl = customRedirectUrl || redirectUrl;
    console.log('Starting OAuth flow for:', provider);
    console.log('Using redirect URL:', finalRedirectUrl);
    
    const options = {
      provider,
      options: {
        redirectTo: finalRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: true, // We'll handle the redirect manually
      },
    };

    console.log('OAuth options:', JSON.stringify(options, null, 2));
    
    const { data, error } = await supabase.auth.signInWithOAuth(options);
    
    if (error) {
      console.error('OAuth error:', error);
      throw error;
    }
    
    console.log('OAuth response data:', data);
    
    // Ensure we have a URL to redirect to
    if (!data?.url) {
      throw new Error('No authentication URL received from the server');
    }
    
    // Return a consistent response format
    return {
      url: data.url,
      provider: data.provider,
    };
  } catch (error) {
    console.error('Error in signInWithOAuth:', error);
    throw error;
  }
};

// Helper function to sign in with Google
export const signInWithGoogle = async (customRedirectUrl = null) => {
  return signInWithOAuth('google', customRedirectUrl);
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
