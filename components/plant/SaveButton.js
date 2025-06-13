import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SaveButton({ onPress }) {
  const [isSaved, setIsSaved] = useState(false);

  const handlePress = () => {
    setIsSaved(!isSaved);
    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.saveButton} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.saveText}>Save</Text>
      <Ionicons 
        name={isSaved ? 'bookmark' : 'bookmark-outline'} 
        size={16} 
        color={isSaved ? '#2E7D32' : '#2E7D32'} 
        style={styles.icon}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignSelf: 'center',
    marginBottom: 16,
  },
  saveText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  icon: {
    marginTop: 1, // Minor vertical alignment tweak
  },
});
