import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function PlantJournalTab({ plant }) {
  return (
    <View style={styles.container}>
      <View style={styles.emptyStateContainer}>
        <MaterialIcons name="book" size={64} color="#e0e0e0" />
        <Text style={styles.emptyStateTitle}>Plant Journal</Text>
        <Text style={styles.emptyStateText}>
          This feature is currently under development.
          Soon you'll be able to track your plant's growth and health over time.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 32,
    lineHeight: 20,
  },
});
