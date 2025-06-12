import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function EmailConfirmationScreen() {
  const router = useRouter();
  const { user, checkEmailVerification, loading, signOut } = useAuth();
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const { email: routeEmail } = useLocalSearchParams();
  const [email, setEmail] = useState(routeEmail || '');
  
  console.log('Email confirmation screen mounted with email:', email);
  
  // If we don't have an email, try to get it from the user object or route params
  useEffect(() => {
    if (!email) {
      if (user?.email) {
        console.log('Setting email from user object:', user.email);
        setEmail(user.email);
      } else if (routeEmail) {
        console.log('Setting email from route params:', routeEmail);
        setEmail(routeEmail);
      } else {
        console.log('No email found, redirecting to home');
        router.replace('/');
      }
    }
  }, [user, routeEmail]);

  // Check email verification status periodically
  useEffect(() => {
    if (!email) {
      console.log('No email found, redirecting to home');
      router.replace('/');
      return;
    }

    let isMounted = true;
    let timeoutId = null;
    let checkCount = 0;
    const maxChecks = 12; // Check for about 1 minute (12 checks * 5 seconds)

    const checkVerification = async () => {
      if (!isMounted) return;
      
      try {
        checkCount++;
        console.log(`[${checkCount}/${maxChecks}] Checking email verification status for:`, email);
        
        // Check verification status directly without requiring a session
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.log('Error getting user:', userError);
          throw userError;
        }
        
        if (!currentUser) {
          console.log('No user found, will retry...');
          // Schedule next check
          if (checkCount < maxChecks) {
            timeoutId = setTimeout(checkVerification, 5000);
          } else {
            setError('Verification timed out. Please check your email and click the verification link.');
          }
          return;
        }
        
        console.log('Current user status:', {
          email: currentUser.email,
          email_confirmed: currentUser.email_confirmed_at,
          last_sign_in: currentUser.last_sign_in_at
        });
        
        // Check if email is verified
        const isVerified = currentUser.email_confirmed_at !== null;
        
        if (isVerified) {
          console.log('Email verified!');
          setIsVerified(true);
          // Update the user state
          setUser(currentUser);
          // Redirect to home after a short delay
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(tabs)');
            }
          }, 2000);
          return;
        } else {
          console.log('Email not yet verified, will check again...');
          // Schedule next check
          if (checkCount < maxChecks) {
            timeoutId = setTimeout(checkVerification, 5000);
          } else {
            setError('Verification timed out. Please check your email and click the verification link.');
          }
        }
      } catch (error) {
        console.error('Error in verification check:', {
          message: error.message,
          code: error.code,
          status: error.status,
          originalError: error
        });
        if (isMounted) {
          setError(error.message || 'Error checking verification status');
        }
      } finally {
        if (isMounted) {
          setCheckingVerification(false);
        }
      }
    };

    // Initial check after a short delay to allow session to be established
    const initialDelay = setTimeout(() => {
      checkVerification();
    }, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(initialDelay);
    };
  }, [email]);

  const handleSignInPress = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Error signing out. Please try again.');
    }
  };
  
  const handleResendEmail = async () => {
    try {
      setError('');
      setCheckingVerification(true);
      
      console.log('Resending verification email to:', email);
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'exp://192.168.0.103:8081/--/email-confirmation',
        },
      });
      
      if (resendError) throw resendError;
      
      Alert.alert('Success', 'Verification email resent! Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification email:', error);
      setError(error.message || 'Error resending verification email');
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a confirmation link to
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.instructions}>
          Please check your email and click the verification link to complete your registration.
        </Text>

        {checkingVerification && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Checking verification status...</Text>
          </View>
        )}

        {isVerified && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Email verified! Redirecting...</Text>
            <ActivityIndicator size="small" color="#2E7D32" style={styles.successSpinner} />
          </View>
        )}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Didn't receive the email? Check your spam folder or
          </Text>
          <TouchableOpacity onPress={handleResendEmail} disabled={loading}>
            <Text style={styles.resendLink}>Resend verification email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignInPress}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 32,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 16,
    marginBottom: 8,
  },
  successSpinner: {
    marginTop: 8,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginVertical: 16,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  resendLink: {
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signInButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
});
