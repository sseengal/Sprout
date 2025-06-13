import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ConfidenceBadge({ probability }) {
  return (
    <View style={styles.confidenceBadge}>
      <Text style={styles.confidenceText}>{probability}% Match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  confidenceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  confidenceText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
});
