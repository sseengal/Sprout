import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

import { useLocalSearchParams } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const { signUpWithEmail, signInWithEmail, handleGoogleSignIn, loading, error: authError, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const params = useLocalSearchParams();
  useEffect(() => {
    // Only set mode from URL params on initial load or explicit navigation
    if (params.mode === 'signup') {
      setIsSignUp(true);
      if (params.error) setFormError(params.error);
    } else if (params.mode === 'login') {
      setIsSignUp(false);
      if (params.error) setFormError(params.error);
    }
  }, [params.mode, params.error]);

  const handleGoogleLogin = async () => {
    console.log('Google Sign-In button pressed');
    try {
      console.log('Starting Google Sign-In flow...');
      setIsSubmitting(true);
      setFormError('');
      
      console.log('Calling handleGoogleSignIn...');
      const result = await handleGoogleSignIn();
      console.log('handleGoogleSignIn completed with result:', result);
      // The auth state change will handle the navigation
    } catch (error) {
      console.error('Error in handleGoogleLogin:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setFormError(error.message || 'Failed to sign in with Google');
    } finally {
      console.log('Google Sign-In flow completed, setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (pwd, isConfirm = false) => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    if (!/[A-Z]/.test(pwd)) return 'Include at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Include at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Include at least one number';
    if (isConfirm && pwd !== password) return 'Passwords do not match';
    return '';
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (isSignUp) {
      setPasswordError(validatePassword(text));
      if (confirmPassword) {
        setConfirmPasswordError(validatePassword(confirmPassword, true));
      }
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (isSignUp) {
      setConfirmPasswordError(validatePassword(text, true));
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (formError) setFormError('');
    setEmailError(validateEmail(text));
  };

  const handleEmailSubmit = async () => {
    console.log('handleEmailSubmit called, isSignUp:', isSignUp);
    try {
      setIsSubmitting(true);
      setFormError('');
      
      // Basic validation
      const emailErr = validateEmail(email);
      setEmailError(emailErr);
      
      if (emailErr) {
        console.log('Email validation failed');
        return;
      }
      
      if (isSignUp) {
        const pwdError = validatePassword(password);
        const confirmPwdError = validatePassword(confirmPassword, true);
        
        setPasswordError(pwdError);
        setConfirmPasswordError(confirmPwdError);
        
        if (pwdError || confirmPwdError) {
          console.log('Password validation failed');
          return;
        }
      }
      
      console.log('Form validation passed, attempting authentication...');
      
      if (isSignUp) {
        console.log('Calling signUpWithEmail...');
        const { data, error: signUpError } = await signUpWithEmail(email, password);
        console.log('signUpWithEmail response:', { data, signUpError });
        
        if (signUpError) {
          console.error('Sign up failed:', signUpError);
          throw signUpError;
        }
        
        // Set a flag to prevent automatic navigation away from auth screens during sign-up
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem('isSigningUp', 'true');
        }
        
        console.log('Sign up successful, user:', data?.email);
        // Always redirect on successful signup
        console.log('Navigating to email confirmation screen with email:', email);
        
        // Force navigation to email confirmation screen
        setTimeout(() => {
          router.replace({
            pathname: '/(auth)/email-confirmation',
            params: { email: email },
          });
        }, 100);
        
        return;
      } else {
        console.log('Calling signInWithEmail...');
        const { data, error: signInError } = await signInWithEmail(email, password);
        console.log('signInWithEmail response:', { data, signInError });
        
        if (signInError) {
          console.error('Sign in failed:', signInError);
          throw signInError;
        }
        
        console.log('Sign in successful, user:', data?.user);
        // On successful signin, the auth state change will handle navigation
      }
    } catch (error) {
      console.error('Authentication error:', {
        message: error.message,
        code: error.code,
        status: error.status,
        originalError: error
      });
      const errorMessage = error.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`;
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMode = () => {
    console.log('[toggleAuthMode] called. Current isSignUp:', isSignUp, 'formError:', formError, 'authError:', authError);
    
    // Reset all form fields and errors
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError && setConfirmPasswordError('');
    setFormError('');
    
    // Clear auth error from context
    clearError && clearError();
    
    // Toggle signup mode - do this last to ensure clean state for the new mode
    setIsSignUp(prev => !prev);
    
    // Force a router refresh to clear any URL params that might be setting the mode
    router.setParams({});
  };

  // For now, we'll keep the Facebook button but it won't do anything
  const handleFacebookLogin = () => {
    setFormError('Facebook login is not yet implemented');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to Sprout</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create an account' : 'Sign in to continue'}
            </Text>

            {(authError || formError) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError || formError}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View>
                <View style={[
                  styles.inputContainer,
                  emailError && styles.inputContainerError
                ]}>
                  <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={handleEmailChange}
                    onBlur={() => setEmailError(validateEmail(email))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorTextBelow}>{emailError}</Text>
                ) : null}
              </View>

              <View>
                <View style={[
                  styles.inputContainer,
                  passwordError && styles.inputContainerError
                ]}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={handlePasswordChange}
                    onBlur={() => isSignUp && setPasswordError(validatePassword(password))}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                  />
                </View>
                {isSignUp && passwordError ? (
                  <Text style={styles.errorTextBelow}>{passwordError}</Text>
                ) : null}
              </View>

              {isSignUp && (
                <View>
                  <View style={[
                    styles.inputContainer,
                    confirmPasswordError && styles.inputContainerError
                  ]}>
                    <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={handleConfirmPasswordChange}
                      onBlur={() => setConfirmPasswordError(validatePassword(confirmPassword, true))}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      textContentType="password"
                    />
                  </View>
                  {confirmPasswordError ? (
                    <Text style={styles.errorTextBelow}>{confirmPasswordError}</Text>
                  ) : null}
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.button, 
                  isSignUp && styles.buttonSecondary,
                  isSubmitting && styles.buttonSubmitting
                ]}
                onPress={handleEmailSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color={isSignUp ? '#000' : '#fff'} style={styles.loadingIndicator} />
                    <Text style={isSignUp ? styles.buttonSecondaryText : styles.buttonText}>
                      {isSignUp ? 'Signing Up...' : 'Signing In...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={isSignUp ? styles.buttonSecondaryText : styles.buttonText}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[
                  styles.socialButton, 
                  styles.googleButton,
                  (loading || isSubmitting) && styles.buttonDisabled
                ]}
                onPress={handleGoogleLogin}
                disabled={loading || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="google" size={20} color="#fff" />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton, 
                  styles.facebookButton,
                  loading && styles.buttonDisabled
                ]}
                onPress={handleFacebookLogin}
                disabled={true}
              >
                <MaterialIcons name="facebook" size={20} color="#4267B2" />
                <Text style={[styles.socialButtonText, { color: '#4267B2' }]}>
                  Continue with Facebook
                </Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={toggleAuthMode} disabled={loading}>
                  <Text style={styles.footerLink}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },
  errorTextSmall: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  inputContainerError: {
    borderColor: '#ff3b30',
    marginBottom: 4,
  },
  errorTextBelow: {
    color: '#ff3b30',
    fontSize: 12,
    marginLeft: 8,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#333',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  // Keep the same style as primary button for sign up
  buttonSecondary: {
    backgroundColor: '#2E7D32',
  },
  buttonSubmitting: {
    opacity: 0.8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  googleButton: {
    backgroundColor: '#fff',
  },
  facebookButton: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
});
