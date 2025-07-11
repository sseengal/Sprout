import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function PlantOverviewTab({ plant, onRemove }) {
  return (
    <View style={styles.container}>
      <View style={styles.emptyStateContainer}>
        <MaterialIcons name="dashboard" size={64} color="#e0e0e0" />
        <Text style={styles.emptyStateTitle}>Plant Overview</Text>
        <Text style={styles.emptyStateText}>
          Plant overview information will be available soon.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={onRemove}
      >
        <MaterialIcons name="delete" size={20} color="#fff" />
        <Text style={styles.removeButtonText}>Remove Plant</Text>
      </TouchableOpacity>
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
  },
  removeButton: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
