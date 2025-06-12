import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

// Helper function to log with timestamp and component name
const createLogger = (component) => {
  return (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [${component}]`;
    console.log(message, ...args);
  };
};

// Create the auth context
export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const logger = useMemo(() => createLogger('AuthProvider'), []);

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
    
    // Check active sessions and sets the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionId = session?.user?.id || 'no-session';
      logger(`Auth state changed - Event: ${event}, Session ID: ${sessionId}`);
      
      // Log the previous and new user IDs to track changes
      // Note: user may be stale here, but we only need to log
      // const prevUserId = user?.id || 'none';
      // const newUserId = session?.user?.id || 'none';
      // if (prevUserId !== newUserId) {
      //   logger(`User changed from ${prevUserId} to ${newUserId}`);
      // }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Always set loading to false after we've processed the auth state
      logger('Auth state processed, setting loading to false');
      setLoading(false);
    });

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
    logger('Attempting to sign up with:', { email });
    try {
      setLoading(true);
      setError(null);

      // Sign up the user
      logger('Calling supabase.auth.signUp...');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'exp://192.168.1.36:8081/--/email-confirmation',
        },
      });

      logger('Sign up response:', { data, signUpError });

      if (signUpError) {
        logger('Sign up error:', signUpError);
        throw signUpError;
      }

      logger('Sign up successful, user data:', data);
      return { 
        data: { 
          email: email // Only return the email for the confirmation screen
        }, 
        error: null 
      };
    } catch (error) {
      logger('Error in signUpWithEmail:', {
        message: error.message,
        code: error.code,
        status: error.status,
        originalError: error
      });
      const errorMessage = error.message || 'Failed to sign up';
      setError(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    } finally {
      logger('Sign up process completed');
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    logger('Attempting to sign in with:', { email });
    try {
      setLoading(true);
      setError(null);

      logger('Calling supabase.auth.signInWithPassword...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      logger('Sign in response:', { data, signInError });

      if (signInError) {
        logger('Sign in error:', signInError);
        throw signInError;
      }

      logger('Sign in successful, user data:', data);
      return { data, error: null };
    } catch (error) {
      logger('Error in signInWithEmail:', {
        message: error.message,
        code: error.code,
        status: error.status,
        originalError: error
      });
      const errorMessage = error.message || 'Failed to sign in';
      setError(errorMessage);
      return { data: null, error: new Error(errorMessage) };
    } finally {
      logger('Sign in process completed');
      setLoading(false);
    }
  };

  // Sign out with retry logic
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
    console.log('[Auth] Starting Google Sign-In flow');
    try {
      setLoading(true);
      setError(null);
      let redirectUrl = '';
      let expoOwner = '';
      let expoSlug = '';
      let Constants = null;
      if (Platform.OS === 'web') {
        redirectUrl = `${window.location.origin}/auth/callback`;
        console.log('[Auth] Platform is web, using redirect:', redirectUrl);
      } else if (__DEV__) {
        Constants = require('expo-constants').default;
        expoOwner = (Constants?.manifest?.owner) || (Constants?.expoConfig?.owner) || 'sseengal';
        expoSlug = (Constants?.manifest?.slug) || (Constants?.expoConfig?.slug) || 'sprout-plant-care';
        redirectUrl = `https://auth.expo.io/@${expoOwner}/${expoSlug}`;
        console.log('[Auth] Platform is native dev');
        console.log('[Auth] expoOwner:', expoOwner);
        console.log('[Auth] expoSlug:', expoSlug);
        console.log('[Auth] Constants.manifest:', JSON.stringify(Constants?.manifest, null, 2));
        console.log('[Auth] Constants.expoConfig:', JSON.stringify(Constants?.expoConfig, null, 2));
        console.log('[Auth] Using redirect URL:', redirectUrl);
      } else {
        redirectUrl = 'sprout://auth/callback';
        console.log('[Auth] Platform is native prod, using redirect:', redirectUrl);
      }
      
      // Start the OAuth flow
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (authError) {
        console.error('[Auth] Error getting OAuth URL:', authError);
        throw authError;
      }
      if (!data?.url) {
        throw new Error('No authentication URL received from the server');
      }
      console.log('[Auth] Opening browser for authentication with:', data.url);
      let browserResult;
      try {
        browserResult = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            createTask: false,
          }
        );
        console.log('[Auth] Browser session completed:', browserResult);
      } catch (browserErr) {
        console.error('[Auth] WebBrowser.openAuthSessionAsync threw:', browserErr);
        throw browserErr;
      }
      if (WebBrowser.maybeCompleteAuthSession) {
        WebBrowser.maybeCompleteAuthSession();
      }
      if (browserResult.type === 'success' && browserResult.url) {
        console.log('[Auth] Handling OAuth callback with URL:', browserResult.url);
        await handleAuthCallback(browserResult.url);
      } else if (browserResult.type === 'cancel') {
        throw new Error('Authentication was cancelled');
      } else {
        throw new Error('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('[Auth] Google Sign-In Error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  const handleAuthCallback = useCallback(async (url) => {
  console.log('[Auth] handleAuthCallback called with URL:', url);
    console.log('[Auth] Handling auth callback with URL:', url);
    
    if (!url) {
      throw new Error('No URL provided to handleAuthCallback');
    }
    
    const currentRouter = router;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if this is an OAuth callback URL from the redirect
      if (url.includes('access_token') || url.includes('error=') || url.includes('type=signin')) {
        console.log('[Auth] Processing OAuth callback URL');
        
        // Parse the URL to get query parameters
        let params;
        try {
          const urlObj = new URL(url);
          params = new URLSearchParams(urlObj.search);
        } catch (e) {
          console.error('[Auth] Error parsing URL:', e);
          throw new Error('Invalid callback URL format');
        }
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        
        console.log('[Auth] Extracted tokens from URL:', { 
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          error: error || 'none'
        });
        
        if (error) {
          const errorDesc = params.get('error_description') || 'No description';
          throw new Error(`OAuth error: ${error} - ${errorDesc}`);
        }
        
        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          console.log('[Auth] Setting session with tokens from URL');
          const { data: { session: newSession }, error: sessionError } = 
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          
          if (sessionError) throw sessionError;
          
          // Get the user data
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          
          if (!user) throw new Error('No user data available after authentication');
          
          console.log('[Auth] User authenticated successfully:', user.email);
          setUser(user);
          setSession(newSession);
          currentRouter.replace('/(tabs)');
          return;
        }
        
        // If we get here, try to get the session directly
        console.log('[Auth] No tokens in URL, trying to get session directly');
        const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !newSession) {
          throw new Error('No valid session found after OAuth flow');
        }
        
        // Get the user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) throw new Error('No user data available after authentication');
        
        console.log('[Auth] User authenticated successfully (direct session):', user.email);
        setUser(user);
        setSession(newSession);
        currentRouter.replace('/(tabs)');
        
      } else if (url.includes('auth/callback')) {
        console.log('[Auth] Handling custom scheme callback');
        
        // Try to get the session from the URL
        const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!newSession) throw new Error('No session found in callback URL');
        
        // Get the user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) throw new Error('No user data available in callback');
        
        console.log('[Auth] User authenticated successfully (custom scheme):', user.email);
        setUser(user);
        setSession(newSession);
        currentRouter.replace('/(tabs)');
        
      } else {
        console.log('[Auth] Not a recognized OAuth callback URL, ignoring');
      }
      
    } catch (error) {
      console.error('[Auth] Error in handleAuthCallback:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setError(error.message || 'Authentication failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser, setSession, router]);

  // Test function to simulate a successful authentication
  const testDeepLink = async () => {
    console.log('Simulating successful authentication...');
    try {
      setLoading(true);
      
      // Create a mock user object for testing
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://ui-avatars.com/api/?name=Test+User&background=random',
        },
        app_metadata: {
          provider: 'email',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Create a mock session
      const mockSession = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };
      
      console.log('Setting mock user and session...');
      
      // Set the mock user and session
      setUser(mockUser);
      setSession(mockSession);
      
      // Navigate to the home screen
      console.log('Navigating to home screen...');
      router.replace('/(tabs)');
      
      console.log('Test authentication completed successfully');
    } catch (error) {
      console.error('Error in testDeepLink:', error);
      setError(error.message || 'Failed to simulate authentication');
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

export default AuthProvider;
