import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlantInfoSection({ scientificName, family, genus, wikiUrl }) {
  const openWikiPage = () => {
    if (wikiUrl) Linking.openURL(wikiUrl);
  };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Scientific Name</Text>
      <Text style={styles.sectionContent}>{scientificName}</Text>
      {family !== 'Not available' && (
        <View style={styles.infoRow}>
          <Ionicons name="leaf" size={16} color="#666" />
          <Text style={styles.infoText}>Family: {family}</Text>
        </View>
      )}
      {genus !== 'Not available' && (
        <View style={styles.infoRow}>
          <Ionicons name="leaf" size={16} color="#666" />
          <Text style={styles.infoText}>Genus: {genus}</Text>
        </View>
      )}
      {wikiUrl && (
        <TouchableOpacity style={styles.wikiButton} onPress={openWikiPage}>
          <Ionicons name="open-outline" size={16} color="#4CAF50" />
          <Text style={styles.wikiButtonText}>View on Wikipedia</Text>
        </TouchableOpacity>
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
  sectionContent: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  wikiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  wikiButtonText: {
    marginLeft: 5,
    color: '#2E7D32',
    fontWeight: '500',
  },
});
