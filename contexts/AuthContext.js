import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getRedirectUrl, createLogger } from '../utils/authUtils';

// Utility functions moved to utils/authUtils.js

// Create the auth context
export const AuthContext = createContext({});

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export const AuthProvider = ({ children }) => {
  const logger = useMemo(() => createLogger('AuthProvider'), []);
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Log component mount/unmount
  useEffect(() => {
    logger('AuthProvider mounted');
    return () => logger('AuthProvider unmounted');
  }, [logger]);

  useEffect(() => {
    logger('Setting up auth state listener');
    
    // Track if we're in the middle of an auth operation
    let isAuthInProgress = false;
    let cleanupTimeout;
    
    // Check active sessions and sets the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionId = session?.user?.id || 'no-session';
      logger(`[Auth State Change] Event: ${event}, Session ID: ${sessionId}`, { event, session: !!session });
      
      // Clear any pending cleanup
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          // These events should update the session
          logger(`[${event}] Updating session for user:`, session?.user?.email);
          setSession(session);
          setUser(session?.user || null);
          break;
          
        case 'SIGNED_OUT':
          logger('[SIGNED_OUT] Clearing session');
          setSession(null);
          setUser(null);
          break;
          
        case 'PASSWORD_RECOVERY':
          logger('[PASSWORD_RECOVERY] Handling password recovery');
          // Handle password recovery if needed
          break;
          
        default:
          logger(`[${event}] Unhandled auth event`);
          break;
      }
      
      // Always set loading to false after processing
      if (loading) {
        logger('Setting loading to false after auth state change');
        setLoading(false);
      }
      
      // Reset auth in progress flag after a short delay to ensure all state updates are processed
      if (isAuthInProgress) {
        cleanupTimeout = setTimeout(() => {
          isAuthInProgress = false;
          logger('Reset isAuthInProgress flag');
        }, 1000);
      }
    });
    
    // Store the original signIn and signUp functions
    const originalSignIn = supabase.auth.signInWithPassword;
    const originalSignUp = supabase.auth.signUp;
    
    // Wrap the signIn function to track auth operations
    supabase.auth.signInWithPassword = async (...args) => {
      logger('Starting sign in with password');
      isAuthInProgress = true;
      try {
        const result = await originalSignIn.apply(supabase.auth, args);
        logger('Sign in with password completed', { error: result.error });
        return result;
      } catch (error) {
        logger('Error in sign in with password:', error);
        throw error;
      } finally {
        // Don't reset isAuthInProgress here - let the auth state change handler handle it
      }
    };
    
    // Wrap the signUp function to track auth operations
    supabase.auth.signUp = async (...args) => {
      logger('Starting sign up');
      isAuthInProgress = true;
      try {
        const result = await originalSignUp.apply(supabase.auth, args);
        logger('Sign up completed', { error: result.error });
        return result;
      } catch (error) {
        logger('Error in sign up:', error);
        throw error;
      } finally {
        // Don't reset isAuthInProgress here - let the auth state change handler handle it
      }
    };

    // Cleanup subscription on unmount
    return () => {
      logger('Cleaning up auth state listener');
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      } else {
        logger('No subscription to unsubscribe from');
      }
    };
  }, [logger]);

  // Sign up with email and password
  const signUpWithEmail = async (email, password) => {
    logger('[SIGNUP] Starting sign up process for email:', email);
    try {
      setLoading(true);
      setError(null);

      // Sign up the user
      logger('[SIGNUP] Preparing to call supabase.auth.signUp...');
      
      // Get the current URL for redirection
      const redirectUrl = Constants?.expoConfig?.extra?.authRedirectUrl || 
                         process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 
                         'exp://localhost:8081/--/email-confirmation';
      
      logger('[SIGNUP] Using email redirect URL:', redirectUrl);
      
      // Step 1: Create the auth user
      logger('[SIGNUP] Calling supabase.auth.signUp...');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      logger('[SIGNUP] Auth sign up response received');
      logger('[SIGNUP] Auth data:', JSON.stringify(data, null, 2));
      
      if (signUpError) {
        logger('[SIGNUP] Error in auth sign up:', {
          code: signUpError.code,
          message: signUpError.message,
          status: signUpError.status
        });
        throw signUpError;
      }

      // Create customer record using server-side function
      if (data?.user?.id) {
        logger(`[SIGNUP] Auth user created successfully with ID: ${data.user.id}`);
        logger('[SIGNUP] Creating customer record...');
        
        try {
          const { data: customerData, error: customerError } = await supabase.rpc('handle_new_customer', { 
            p_user_id: data.user.id 
          });
          
          if (customerError) {
            logger('[SIGNUP] Customer creation failed:', {
              message: customerError.message,
              code: customerError.code,
              details: customerError.details,
              hint: customerError.hint
            });
            throw customerError;
          }
          
          if (!customerData) {
            throw new Error('No data returned from customer creation');
          }
          
          logger('[SIGNUP] Customer record created successfully:', customerData);
          return { 
            data: { 
              email: email,
              userId: data.user.id
            }, 
            error: null 
          };
          
        } catch (error) {
          logger('[SIGNUP] Error creating customer record:', error);
          
          // Clean up auth user if customer creation fails
          try {
            logger('[SIGNUP] Cleaning up auth user due to customer record creation failure');
            await supabase.auth.admin.deleteUser(data.user.id);
            logger('[SIGNUP] Successfully cleaned up auth user');
          } catch (cleanupError) {
            logger('[SIGNUP] Error during cleanup of auth user:', {
              message: cleanupError.message,
              code: cleanupError.code
            });
          }
          
          throw new Error('Failed to complete signup. Please try again.');
        }
      } else {
        const errorMsg = 'No user ID available in signup response';
        logger(`[SIGNUP] ${errorMsg} - Data received:`, JSON.stringify(data, null, 2));
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign up';
      logger('[SIGNUP] Error in signUpWithEmail:', {
        message: errorMessage,
        code: error.code,
        status: error.status,
        originalError: error
      });
      setError(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    } finally {
      logger('[SIGNUP] Sign up process completed');
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    logger('[signInWithEmail] Attempting to sign in with:', { email });
    try {
      setLoading(true);
      setError(null);
      
      logger('[signInWithEmail] Calling supabase.auth.signInWithPassword...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      logger('[signInWithEmail] Sign in response:', { 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: signInError 
      });

      if (signInError) {
        logger('[signInWithEmail] Sign in error:', signInError);
        throw signInError;
      }

      if (!data?.session) {
        const error = new Error('No session returned from sign in');
        logger('[signInWithEmail] Error:', error);
        throw error;
      }

      logger('[signInWithEmail] Sign in successful, user data:', { 
        userId: data.user?.id,
        email: data.user?.email 
      });
      
      // Explicitly update the session and user state
      setSession(data.session);
      setUser(data.user);
      
      return { data, error: null };
    } catch (error) {
      logger('[signInWithEmail] Error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        originalError: error
      });
      const errorMessage = error.message || 'Failed to sign in';
      setError(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    } finally {
      logger('[signInWithEmail] Process completed');
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const retryDelay = 1000; // 1 second

    logger(`Starting sign out (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    try {
      setLoading(true);

      // Clear local state first to prevent UI flicker
      const wasLoggedIn = !!user;
      setUser(null);
      setSession(null);

      if (!wasLoggedIn) {
        logger('No user was logged in, skipping server sign out');
        return { error: null };
      }

      // Attempt to sign out from the server
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger(`Sign out error (attempt ${retryCount + 1}):`, error);

        if (retryCount < MAX_RETRIES) {
          logger(`Retrying sign out in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return signOut(retryCount + 1);
        }
        throw error;
      }
      
      logger('Successfully signed out from server');
      return { error: null };
      
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign out';
      logger('Sign out failed:', errorMessage, error);
      setError(errorMessage);
      return { error };
      
    } finally {
      setLoading(false);
      
      // Ensure we navigate to login after a short delay
      // This acts as a fallback in case the auth state change listener doesn't trigger
      setTimeout(() => {
        if (!user) {
          logger('Ensuring navigation to login page after sign out');
          try {
            router.replace('/');
          } catch (navError) {
            logger('Error during navigation after sign out:', navError);
          }
        }
      }, 100);
    }
  };

  // Check if user's email is verified
  const checkEmailVerification = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get the current session first
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('Session error:', sessionError);
        throw sessionError;
      }
      
      // If no session, return not verified
      if (!currentSession) {
        console.log('No active session found');
        return { verified: false, error: 'No active session' };
      }
      
      // Get the current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.log('Error getting user:', userError);
        throw userError;
      }
      
      if (!currentUser) {
        console.log('No user found in session');
        return { verified: false, error: 'No user found' };
      }
      
      console.log('Checking verification for user:', currentUser.email);
      
      // Check if email is confirmed in the users table
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('email_confirmed_at')
        .eq('id', currentUser.id)
        .single();
      
      if (userDataError) {
        console.log('Error fetching user data:', userDataError);
        // If the users table doesn't exist or has an error, check the auth.users table
        const isVerified = currentUser.email_confirmed_at || currentUser.email_confirmed_at !== null;
        if (isVerified) {
          setUser(currentUser);
          setSession(currentSession);
        }
        return { verified: isVerified, error: null };
      }
      
      const isVerified = !!userData?.email_confirmed_at;
      console.log('Verification status:', { isVerified, userData });
      
      if (isVerified) {
        // Update local state if verified
        setUser(currentUser);
        setSession(currentSession);
      }
      
      return { verified: isVerified, error: null };
    } catch (error) {
      console.error('Error in checkEmailVerification:', {
        message: error.message,
        code: error.code,
        status: error.status,
        originalError: error
      });
      return { verified: false, error };
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Resend verification email
  const resendVerificationEmail = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Email Sent',
        'A new verification email has been sent to your email address.'
      );
      
      return { error: null };
    } catch (error) {
      console.error('Error resending verification email:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to resend verification email. Please try again.'
      );
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const handleGoogleSignIn = async () => {
    console.log('[Auth] ===== Starting Google Sign-In flow =====');
    console.log('[Auth] Platform:', Platform.OS);
    console.log('[Auth] Environment:', process.env.NODE_ENV);
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the redirect URL
      const redirectUrl = getRedirectUrl();
      console.log('[Auth] Using redirect URL:', redirectUrl);
      console.log('[Auth] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      
      // Log current URL and origin for web
      if (Platform.OS === 'web') {
        console.log('[Auth] Current window location:', {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        });
      }

      // For web, we'll let Supabase handle the redirect
      if (Platform.OS === 'web') {
        console.log('[Auth] Initiating web-based OAuth flow');
        console.log('[Auth] Calling supabase.auth.signInWithOAuth with:', {
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        console.log('[Auth] signInWithOAuth response:', { data, error: error?.message });
        
        if (error) {
          console.error('[Auth] Error in signInWithOAuth:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.status
          });
          throw error;
        }
        
        console.log('[Auth] OAuth flow initiated successfully, waiting for redirect...');
        return;
      }
      
      // For non-web platforms (kept for future compatibility)
      const authUrl = `https://${process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('https://', '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&response_type=code&access_type=offline&prompt=consent`;
      console.log('[Auth] Auth URL:', authUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl,
        { showInRecents: true }
      );

      console.log('[Auth] OAuth result type:', result.type);
      
      if (result.type === 'success' && result.url) {
        console.log('[Auth] Handling OAuth callback with URL:', result.url);
        await handleAuthCallback(result.url);
      } else if (result.type === 'cancel') {
        console.log('[Auth] User cancelled the sign in');
        throw new Error('Sign in was cancelled');
      } else {
        console.error('[Auth] Authentication failed. Result:', result);
        throw new Error('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('[Auth] Google Sign-In Error:', error.message);
      
      // User-friendly error messages
      let userMessage = 'Sign in failed. Please try again.';
      
      if (error.message.includes('cancelled') || error.message.includes('dismissed')) {
        userMessage = 'Sign in was cancelled';
      } else if (error.message.includes('offline')) {
        userMessage = 'Unable to connect. Please check your network connection.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Authentication timed out. Please try again.';
      } else if (error.message.includes('access_denied')) {
        userMessage = 'Please grant permissions to continue.';
      }
      
      setError(userMessage);
      throw new Error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  const handleAuthCallback = useCallback(async (url) => {
    console.log('[Auth] ===== Starting OAuth Callback Handling =====');
    console.log('[Auth] Callback URL:', url);
    console.log('[Auth] Platform:', Platform.OS);
    console.log('[Auth] Environment:', process.env.NODE_ENV);
    
    if (!url) {
      const error = new Error('No URL provided to handleAuthCallback');
      console.error('[Auth] Error:', error);
      throw error;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // For web, let Supabase handle the session
      if (Platform.OS === 'web') {
        console.log('[Auth] Handling web OAuth callback');
        console.log('[Auth] Current window location:', {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        });
        
        console.log('[Auth] Attempting to get session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] Error getting session:', {
            name: sessionError.name,
            message: sessionError.message,
            code: sessionError.code,
            status: sessionError.status,
            stack: sessionError.stack
          });
          throw sessionError;
        }
        
        if (!session) {
          const error = new Error('No session found after OAuth redirect');
          console.error('[Auth] Error:', error);
          throw error;
        }
        
        console.log('[Auth] Session retrieved successfully:', {
          user: {
            id: session.user?.id,
            email: session.user?.email,
            email_confirmed: session.user?.email_confirmed_at ? 'Yes' : 'No'
          },
          expires_at: new Date(session.expires_at * 1000).toISOString(),
          expires_in: session.expires_in,
          token_type: session.token_type
        });
        
        console.log('[Auth] Updating user and session state...');
        setUser(session.user);
        setSession(session);
        
        // Navigate to the home screen after successful authentication
        if (router) {
          console.log('[Auth] Navigating to home screen...');
          router.replace('/(tabs)');
        } else {
          console.warn('[Auth] Router not available for navigation');
        }
        
        console.log('[Auth] Web OAuth flow completed successfully');
        return;
      }
      
      // For native platforms (kept for future compatibility)
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash.substring(1));
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const oauthError = params.get('error');
      
      if (oauthError) {
        const errorDesc = params.get('error_description') || 'No description';
        throw new Error(`OAuth error: ${oauthError} - ${errorDesc}`);
      }
      
      if (!accessToken || !refreshToken) {
        throw new Error('No tokens found in the callback URL');
      }
      
      // Set the session with the tokens from the URL
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (sessionError) throw sessionError;
      if (!data.session) throw new Error('No session found after setting tokens');
      
      // Get the user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Update the state with the new session and user
      setSession(data.session);
      setUser(userData.user);
      
      // Navigate to the home screen after successful authentication
      if (router) {
        router.replace('/(tabs)');
      }
      
      console.log('[Auth] Authentication successful, user:', userData.user?.email);
      
    } catch (error) {
      console.error('[Auth] Error in handleAuthCallback:', error);
      setError(error.message || 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser, setSession, router]);

  // Test function to simulate a successful authentication
  const testDeepLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting test authentication...');
      
      // For web, we'll use a real session instead of mock data
      if (Platform.OS === 'web') {
        console.log('Using real session for web...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!session) throw new Error('No active session');
        
        setUser(session.user);
        setSession(session);
      } else {
        // For native, use mock data (only for testing)
        console.log('Using mock data for native...');
        const mockUser = {
          id: 'mock-user-id',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        const mockSession = {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser,
        };
        
        setUser(mockUser);
        setSession(mockSession);
      }
      
      // Navigate to the home screen
      if (router) {
        console.log('Navigating to home screen...');
        router.replace('/(tabs)');
      }
      
      console.log('Test authentication completed successfully');
    } catch (error) {
      console.error('Error in testDeepLink:', error);
      setError(error.message || 'Failed to simulate authentication');
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
    signUpWithEmail,
    signInWithEmail,
    signOut,
    checkEmailVerification,
    resendVerificationEmail,
    handleAuthCallback,
    testDeepLink,
    handleGoogleSignIn,
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
