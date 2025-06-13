import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SaveButton({ onPress, saved = false, label = 'Save' }) {
  return (
    <TouchableOpacity 
      style={styles.saveButton} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.saveText}>{label}</Text>
      <Ionicons 
        name={saved ? 'bookmark' : 'bookmark-outline'} 
        size={16} 
        color={'#2E7D32'} 
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
