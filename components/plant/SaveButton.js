import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SaveButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.saveButton} onPress={onPress}>
      <Ionicons name="bookmark" size={20} color="#fff" />
      <Text style={styles.saveButtonText}>Save to My Plants</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
