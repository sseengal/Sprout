import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CareInstructionsSection({ careTips }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Care Instructions</Text>
      {careTips.watering && (
        <View style={styles.careItem}>
          <Ionicons name="water" size={20} color="#2196F3" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Watering</Text>
            <Text style={styles.careDescription}>{careTips.watering}</Text>
          </View>
        </View>
      )}
      {careTips.sunlight && (
        <View style={styles.careItem}>
          <Ionicons name="sunny" size={20} color="#FFC107" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Sunlight</Text>
            <Text style={styles.careDescription}>{careTips.sunlight}</Text>
          </View>
        </View>
      )}
      {careTips.temperature && (
        <View style={styles.careItem}>
          <Ionicons name="thermometer" size={20} color="#F44336" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Temperature</Text>
            <Text style={styles.careDescription}>{careTips.temperature}</Text>
          </View>
        </View>
      )}
      {careTips.fertilizer && (
        <View style={styles.careItem}>
          <Ionicons name="nutrition" size={20} color="#8BC34A" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Fertilizer</Text>
            <Text style={styles.careDescription}>{careTips.fertilizer}</Text>
          </View>
        </View>
      )}
      {careTips.customTips && Array.isArray(careTips.customTips) && careTips.customTips.length > 0 && (
        <View style={styles.careItem}>
          <Ionicons name="list" size={20} color="#607D8B" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Additional Tips</Text>
            {careTips.customTips.map((tip, idx) => (
              <Text key={idx} style={styles.careDescription}>• {tip}</Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1B5E20',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  careItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  careTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#2E7D32',
  },
  careDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 4,
  },
});
