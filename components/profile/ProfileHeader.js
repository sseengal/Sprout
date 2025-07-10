import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * ProfileHeader component displays the user's avatar, name and email
 * @param {Object} user - The user object containing user information
 * @returns {JSX.Element} The profile header component
 */
export default function ProfileHeader({ user }) {
  return (
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        {user?.user_metadata?.avatar_url ? (
          <Image 
            source={{ uri: user.user_metadata.avatar_url }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialIcons name="person" size={60} color="#fff" />
          </View>
        )}
      </View>
      
      <Text style={styles.userName}>
        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
      </Text>
      
      {user?.email && (
        <Text style={styles.userEmail}>{user.email}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#81C784',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
