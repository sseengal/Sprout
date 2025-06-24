import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { handleAuthCallback } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        setLoading(true);
        await handleAuthCallback();
      } catch (err) {
        console.error('Error processing auth callback:', err);
        setError(err.message || 'An error occurred during authentication');
      } finally {
        setLoading(false);
      }
    };

    processAuthCallback();
  }, [handleAuthCallback]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.text}>Completing sign in...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, styles.error]}>{error}</Text>
        <Button
          title="Back to Login"
          onPress={() => router.replace('/')}
          color="#4CAF50"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Finishing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  error: {
    color: '#d32f2f',
    marginBottom: 20,
  },
});
