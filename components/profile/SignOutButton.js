import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * SignOutButton component displays a sign out button with icon
 * @param {Function} onSignOut - Function to call when sign out is pressed
 * @returns {JSX.Element} The sign out button component
 */
export default function SignOutButton({ onSignOut }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={onSignOut}
      >
        <View style={styles.menuItemLeft}>
          <MaterialIcons name="logout" size={24} color="#E53935" />
          <Text style={[styles.menuItemText, { color: '#E53935' }]}>Sign Out</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
  },
});
