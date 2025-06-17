import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

import { useRouter } from 'expo-router';

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
    
    // Check active sessions and sets the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionId = session?.user?.id || 'no-session';
      logger(`Auth state changed - Event: ${event}, Session ID: ${sessionId}`);
      
      // Skip state updates during auth operations to prevent UI flicker
      if (isAuthInProgress) {
        logger(`Skipping state update during auth operation: ${event}`);
        return;
      }
      
      // Only update state for relevant auth events
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_OUT') {
        logger(`Skipping state update for event: ${event}`);
        return;
      }
      
      // Only update state if we have a valid session
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      
      // Always set loading to false after we've processed the auth state
      logger('Auth state processed, setting loading to false');
      setLoading(false);
    });
    
    // Store the original signIn and signUp functions
    const originalSignIn = supabase.auth.signInWithPassword;
    const originalSignUp = supabase.auth.signUp;
    
    // Wrap the signIn function to track auth operations
    supabase.auth.signInWithPassword = async (...args) => {
      isAuthInProgress = true;
      try {
        return await originalSignIn.apply(supabase.auth, args);
      } finally {
        isAuthInProgress = false;
      }
    };
    
    // Wrap the signUp function to track auth operations
    supabase.auth.signUp = async (...args) => {
      isAuthInProgress = true;
      try {
        return await originalSignUp.apply(supabase.auth, args);
      } finally {
        isAuthInProgress = false;
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

      // Step 2: Try client-side approach first (wait for session)
      if (data?.user?.id) {
        logger(`[SIGNUP] Auth user created successfully with ID: ${data.user.id}`);
        logger('[SIGNUP] Waiting for session to be established...');
        
        // Try client-side approach first (Option 1)
        try {
          // Wait for up to 5 seconds for the session to be established
          const maxAttempts = 10;
          let attempts = 0;
          let session = null;
          
          while (attempts < maxAttempts && !session) {
            attempts++;
            logger(`[SIGNUP] Checking for session (attempt ${attempts}/${maxAttempts})...`);
            
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              logger('[SIGNUP] Error checking session:', sessionError);
            } else if (sessionData?.session) {
              session = sessionData.session;
              logger('[SIGNUP] Session established successfully!');
              break;
            }
            
            // Wait 500ms before next attempt
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          if (!session) {
            throw new Error('Failed to establish session after multiple attempts');
          }
          
          // Now that we have a session, try creating the customer record
          logger('[SIGNUP] Session established, creating customer record...');
          const customerRecord = await ensureCustomerRecord(data.user.id, email, true);
          
          if (!customerRecord) {
            throw new Error('Failed to create customer record after session was established');
          }
          
          logger(`[SIGNUP] Customer record created successfully with ID: ${customerRecord.id}`);
          return { 
            data: { 
              email: email,
              userId: data.user.id
            }, 
            error: null 
          };
          
        } catch (clientSideError) {
          logger('[SIGNUP] Client-side approach failed, falling back to server-side function', {
            error: clientSideError.message
          });
          
          // Fall back to server-side function (Option 2)
          try {
            logger('[SIGNUP] Attempting server-side customer record creation...');
            const { data: serverData, error: serverError } = await supabase.rpc('handle_new_customer', { p_user_id: data.user.id });
            
            if (serverError) {
              throw serverError;
            }
            
            if (!serverData) {
              throw new Error('No data returned from server-side customer creation');
            }
            
            logger('[SIGNUP] Server-side customer creation successful:', serverData);
            return { 
              data: { 
                email: email,
                userId: data.user.id
              }, 
              error: null 
            };
            
          } catch (serverSideError) {
            logger('[SIGNUP] Server-side approach also failed:', {
              error: serverSideError.message,
              stack: serverSideError.stack
            });
            
            // If both approaches fail, clean up the auth user
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

  // Helper function to ensure a customer record exists for the user
  const ensureCustomerRecord = async (userId, email, isNewUser = false) => {
    try {
      logger(`[CUSTOMER RECORD] Starting ensureCustomerRecord for user: ${userId}, isNewUser: ${isNewUser}`);
      
      // For new users, call the server-side function that bypasses RLS
      if (isNewUser) {
        logger('[CUSTOMER RECORD] New user signup - using server-side customer creation');
        
        const { data, error } = await supabase.rpc('handle_new_customer', { p_user_id: userId });
        
        if (error) {
          logger('[CUSTOMER RECORD] Error in server-side customer creation:', error);
          throw error;
        }
        
        if (!data) {
          const errorMsg = 'No data returned from server-side customer creation';
          logger(`[CUSTOMER RECORD] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        logger('[CUSTOMER RECORD] Server-side customer creation successful:', data);
        return data;
      }
      
      // For non-new users, check if customer record exists
      logger(`[CUSTOMER RECORD] Checking for existing customer record for user: ${userId}`);
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        logger('[CUSTOMER RECORD] Error fetching customer record:', fetchError);
        throw fetchError;
      }
      
      // If no customer record exists for existing user, create one
      if (!existingCustomer) {
        logger('[CUSTOMER RECORD] No customer record found for existing user, creating one');
        
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            user_id: userId,
            email: email,
            name: email.split('@')[0],
            subscription_status: 'inactive',
            plan_type: 'free',
            billing_interval: 'month',
            phone: '',
            address: {},
            metadata: {},
            cancel_at_period_end: false
          })
          .select()
          .single();
          
        if (createError) {
          logger('[CUSTOMER RECORD] Error creating customer record:', createError);
          throw createError;
        }
        
        if (!newCustomer) {
          const errorMsg = 'No data returned after customer record creation';
          logger(`[CUSTOMER RECORD] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        logger('[CUSTOMER RECORD] Created new customer record:', newCustomer);
        return newCustomer;
      }
      
      // If customer exists and this is a login (not a new signup), update the record
      if (!isNewUser) {
        logger('[CUSTOMER RECORD] Updating existing customer record for user:', userId);
        
        // Only update email and updated_at timestamp on login
        const updateData = {
          email: email, // Ensure email is up to date
          updated_at: new Date().toISOString()
        };
        
        const { error: updateError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('user_id', userId);

        if (updateError) {
          logger('[CUSTOMER RECORD] Error updating customer record:', updateError);
          // Log but don't throw to avoid disrupting the login flow
        } else {
          logger('[CUSTOMER RECORD] Updated customer record successfully');
        }
      }
      
      // If we get here, the customer record exists
      logger('[CUSTOMER RECORD] Using existing customer record:', existingCustomer);
      return existingCustomer;
    } catch (error) {
      logger('[CUSTOMER RECORD] Exception in ensureCustomerRecord:', error);
      throw error;
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

      // Ensure customer record exists after successful sign-in
      // Pass isNewUser=false to indicate this is a login, not a new signup
      if (data?.user?.id) {
        logger('Ensuring customer record exists for user:', data.user.id);
        const customerRecord = await ensureCustomerRecord(data.user.id, email, false);
        logger('Customer record status:', customerRecord ? 'Found/Updated' : 'Failed to verify');
      } else {
        logger('Warning: No user ID available after sign in');
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
    logger('[Auth] handleAuthCallback called with URL:', url);
    
    if (!url) {
      throw new Error('No URL provided to handleAuthCallback');
    }
    
    const currentRouter = router;
    let newSession = null;
    let user = null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Parse the URL to extract tokens if present
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash.substring(1));
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error');
      
      // Check if this is an OAuth callback URL from the redirect
      if (accessToken && refreshToken) {
        logger('[Auth] Processing OAuth callback with tokens');
        
        // Set the session with the tokens from the URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) throw sessionError;
        newSession = data.session;
        
        // Get the user data
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        user = userData.user;
        
      } else if (error) {
        // Handle OAuth error
        const errorDesc = params.get('error_description') || 'No description';
        throw new Error(`OAuth error: ${error} - ${errorDesc}`);
        
      } else if (url.includes('auth/callback')) {
        // OAuth callback without tokens in URL (handled by Supabase internally)
        logger('[Auth] Handling OAuth callback without tokens');
        
        // Get the session directly
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('No session found after OAuth callback');
        
        newSession = data.session;
        
        // Get the user data
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        user = userData.user;
        
      } else if (url.includes('token_refresh=true') || url.includes('type=recovery')) {
        // Token refresh or password recovery flow
        logger('[Auth] Handling token refresh or recovery');
        
        // Get the session directly
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('No session found after token refresh/recovery');
        
        newSession = data.session;
        
        // Get the user data
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        user = userData.user;
        
      } else {
        logger('[Auth] Not a recognized auth callback URL, ignoring');
        setLoading(false);
        return;
      }
      
      // Verify we have a user
      if (!user) {
        throw new Error('No user data available after authentication');
      }
      
      logger('[Auth] User authenticated successfully:', user.email);
      
      // For OAuth providers, check if this is a new or returning user
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // If no customer record exists, this is likely a new user
      const isNewUser = !existingCustomer;
      logger('[Auth] Is new user:', isNewUser);
      
      // Ensure customer record exists with proper metadata
      const customerRecord = await ensureCustomerRecord(user.id, user.email, isNewUser);
      logger('[Auth] Customer record status:', customerRecord ? 'Created/Updated' : 'Failed to create/update');
      
      // Update state and navigate
      setUser(user);
      setSession(newSession);
      currentRouter.replace('/(tabs)');
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
