import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const { signUpWithEmail, signInWithEmail, handleGoogleSignIn, loading, error: authError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await handleGoogleSignIn();
      // The auth state change will handle the navigation
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setFormError(error.message || 'Failed to sign in with Google');
    }
  };

  const handleEmailSubmit = async () => {
    console.log('handleEmailSubmit called, isSignUp:', isSignUp);
    try {
      setFormError('');
      
      // Basic validation
      if (!email || !password) {
        const errorMsg = 'Please fill in all fields';
        console.log('Validation error:', errorMsg);
        setFormError(errorMsg);
        return;
      }
      
      if (isSignUp && password !== confirmPassword) {
        const errorMsg = 'Passwords do not match';
        console.log('Validation error:', errorMsg);
        setFormError(errorMsg);
        return;
      }
      
      if (isSignUp && password.length < 6) {
        const errorMsg = 'Password must be at least 6 characters';
        console.log('Validation error:', errorMsg);
        setFormError(errorMsg);
        return;
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
        
        console.log('Sign up successful, user:', data?.email);
        // Redirect to email confirmation screen with email as a query parameter
        router.replace({
          pathname: '/email-confirmation',
          params: { email: email },
        });
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
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setFormError('');
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
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                />
              </View>

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEmailSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
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
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <MaterialIcons name="google" size={20} color="#DB4437" />
                <Text style={[styles.socialButtonText, { color: '#DB4437' }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton]}
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
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  form: {
    width: '100%',
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
