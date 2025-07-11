import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to clear all AsyncStorage data
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
    
    console.log('Storage clearing completed!');
  } catch (error) {
    console.error('Error clearing AsyncStorage data:', error);
  }
};

// Execute the function
clearAllStorage();
