import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [plantName, setPlantName] = useState('');
  
  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };
  
  const handleTextSearch = () => {
    if (!plantName.trim()) return;
    
    // Navigate to Analysis with the plant name for text-based search
    router.push({
      pathname: '/(tabs)/Analysis',
      params: {
        plantData: JSON.stringify({ textSearch: true }),
        plantName: plantName.trim()
      }
    });
  };
  
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ backgroundColor: '#2E7D32' }}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Sprout</Text>
              <Text style={styles.subtitle}>Your Personal Plant Care Assistant</Text>
            </View>
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton}>
              {user?.user_metadata?.avatar_url ? (
                <Image 
                  source={{ uri: user.user_metadata.avatar_url }} 
                  style={styles.avatar} 
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <MaterialIcons name="person" size={24} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcomeText}>
          Identify plants and get care tips instantly
        </Text>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/camera')}
          >
            <MaterialIcons name="camera-alt" size={24} color="white" />
            <Text style={styles.ctaButtonText}>Identify a Plant</Text>
          </TouchableOpacity>
          
          <Text style={styles.orText}>OR</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter plant name (e.g., Monstera)"
              value={plantName}
              onChangeText={setPlantName}
              onSubmitEditing={handleTextSearch}
            />
            <TouchableOpacity 
              style={[styles.ctaButton, !plantName.trim() && styles.disabledButton]}
              onPress={handleTextSearch}
              disabled={!plantName.trim()}
            >
              <MaterialIcons name="search" size={24} color="white" />
              <Text style={styles.ctaButtonText}>Search Plant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    justifyContent: 'center',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    lineHeight: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  orText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
    textAlign: 'center',
  },
  searchContainer: {
    width: '100%',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',  // Lighter green for disabled state
    opacity: 0.7,
  },
});
