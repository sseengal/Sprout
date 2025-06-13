import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NoteContainer() {
  return (
    <View style={styles.noteContainer}>
      <Ionicons name="information-circle" size={20} color="#2196F3" />
      <Text style={styles.noteText}>
        Note: These care instructions are general guidelines. Your plant's needs may vary based on its environment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: '#0D47A1',
    fontSize: 13,
    lineHeight: 18,
  },
});
