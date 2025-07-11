import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClearStorageButton() {
  const clearAllStorage = async () => {
    try {
      // List all keys before clearing
      const keys = await AsyncStorage.getAllKeys();
      console.log('Keys found in AsyncStorage:', keys);
      
      // Clear specific keys related to plants and reminders
      const plantKeys = ['@saved_plants', '@reminders'];
      
      for (const key of plantKeys) {
        if (keys.includes(key)) {
          await AsyncStorage.removeItem(key);
          console.log(`Cleared key: ${key}`);
        } else {
          console.log(`Key not found: ${key}`);
        }
      }
      
      // Verify clearing
      const remainingKeys = await AsyncStorage.getAllKeys();
      console.log('Remaining keys:', remainingKeys);
      
      Alert.alert(
        'Storage Cleared',
        'Plant and reminder data has been cleared. Please restart the app.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error clearing AsyncStorage data:', error);
      Alert.alert('Error', 'Failed to clear storage: ' + error.message);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={() => {
        Alert.alert(
          'Clear Storage',
          'This will delete all saved plants and reminders. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', onPress: clearAllStorage, style: 'destructive' }
          ]
        );
      }}
    >
      <Text style={styles.buttonText}>Clear Storage</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 16,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
