import { supabase } from '../lib/supabase';
import { Platform, Alert } from 'react-native';

export function createAuthApi({ user, session, loading, error, setUser, setSession, setLoading, setError, logger }) {
  // --- Auth Methods ---

  // Sign up with email and password
  const signUpWithEmail = async (email, password) => {
    logger('Attempting to sign up with:', { email });
    try {
      setLoading(true);
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'exp://192.168.1.36:8081/--/email-confirmation',
        },
      });
      logger('Sign up response:', { data, signUpError });
      if (signUpError) throw signUpError;
      logger('Sign up successful, user data:', data);
      return { data: { email }, error: null };
    } catch (error) {
      logger('Error in signUpWithEmail:', error);
      setError(error.message || 'Failed to sign up');
      return { data: null, error: new Error(error.message || 'Failed to sign up') };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    logger('Attempting to sign in with:', { email });
    try {
      setLoading(true);
      setError(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      logger('Sign in response:', { data, signInError });
      if (signInError) throw signInError;
      logger('Sign in successful, user data:', data);
      return { data, error: null };
    } catch (error) {
      logger('Error in signInWithEmail:', error);
      setError(error.message || 'Failed to sign in');
      return { data: null, error: new Error(error.message || 'Failed to sign in') };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    logger('Signing out');
    try {
      setLoading(true);
      setUser(null);
      setSession(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      logger('Successfully signed out');
      return { error: null };
    } catch (error) {
      logger('Sign out failed:', error);
      setError(error.message || 'Failed to sign out');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Check if user's email is verified
  const checkEmailVerification = async () => {
    try {
      setLoading(true);
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!currentSession) return { verified: false, error: 'No active session' };
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) return { verified: false, error: 'No user found' };
      // Check if email is confirmed in the users table
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('email_confirmed_at')
        .eq('id', currentUser.id)
        .single();
      if (userDataError) {
        const isVerified = currentUser.email_confirmed_at || currentUser.email_confirmed_at !== null;
        if (isVerified) {
          setUser(currentUser);
          setSession(currentSession);
        }
        return { verified: isVerified, error: null };
      }
      const isVerified = !!userData?.email_confirmed_at;
      if (isVerified) {
        setUser(currentUser);
        setSession(currentSession);
      }
      return { verified: isVerified, error: null };
    } catch (error) {
      logger('Error in checkEmailVerification:', error);
      return { verified: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Email Sent', 'A new verification email has been sent to your email address.');
      return { error: null };
    } catch (error) {
      logger('Error resending verification email:', error);
      Alert.alert('Error', error.message || 'Failed to resend verification email. Please try again.');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Placeholder: Google sign-in and OAuth callback logic can be filled in as needed
  const handleGoogleSignIn = async () => {
    logger('Google sign-in not implemented in this refactor.');
    setError('Google sign-in not implemented.');
    return { error: new Error('Not implemented') };
  };
  const handleAuthCallback = async (url) => {
    logger('OAuth callback not implemented in this refactor.');
    setError('OAuth callback not implemented.');
    return { error: new Error('Not implemented') };
  };
  const testDeepLink = async () => {
    logger('Test deep link not implemented in this refactor.');
    setError('Test deep link not implemented.');
    return { error: new Error('Not implemented') };
  };

  // Clear error
  const clearError = () => setError(null);

  return {
    signUpWithEmail,
    signInWithEmail,
    signOut,
    checkEmailVerification,
    resendVerificationEmail,
    handleGoogleSignIn,
    handleAuthCallback,
    testDeepLink,
    clearError,
  };
}
