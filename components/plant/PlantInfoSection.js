import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PlantInfoSection({ scientificName, family, genus, origin, growthRate, matureSize, toxicity, funFacts, commonUses, ecologicalRole, culturalUses, historicalUses, wikiUrl }) {
  const openWikiPage = () => {
    if (wikiUrl) Linking.openURL(wikiUrl);
  };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Details</Text>
      {/* Removed scientific name as per user request */}
      {/* Show Gemini fields or fallback */}
      {!(family || genus || origin || growthRate || (matureSize && (matureSize.height || matureSize.width)) || (toxicity && toxicity.level) || (funFacts && funFacts.length > 0) || (commonUses && commonUses.length > 0) || ecologicalRole || culturalUses || historicalUses) ? (
        <Text style={styles.sectionContent}>No detailed information available.</Text>
      ) : null}
      {family && family !== 'Not available' && (
        <View style={styles.infoRow}>
          <Ionicons name="leaf" size={16} color="#666" />
          <Text style={styles.infoText}>Family: {family}</Text>
        </View>
      )}
      {genus && genus !== 'Not available' && (
        <View style={styles.infoRow}>
          <Ionicons name="leaf" size={16} color="#666" />
          <Text style={styles.infoText}>Genus: {genus}</Text>
        </View>
      )}
      {origin && (
        <View style={styles.infoRow}>
          <Ionicons name="earth" size={16} color="#666" />
          <Text style={styles.infoText}>Origin: {origin}</Text>
        </View>
      )}
      {growthRate && (
        <View style={styles.infoRow}>
          <Ionicons name="trending-up" size={16} color="#666" />
          <Text style={styles.infoText}>Growth Rate: {growthRate}</Text>
        </View>
      )}
      {matureSize && (matureSize.height || matureSize.width) && (
        <View style={styles.infoRow}>
          <Ionicons name="resize" size={16} color="#666" />
          <Text style={styles.infoText}>Mature Size: {matureSize.height ? `${matureSize.height} cm` : ''}{matureSize.height && matureSize.width ? ' H × ' : ''}{matureSize.width ? `${matureSize.width} cm` : ''}</Text>
        </View>
      )}
      {toxicity && toxicity.level && (
        <View style={styles.infoRow}>
          <Ionicons name="warning" size={16} color="#E65100" />
          <Text style={styles.infoText}>Toxicity: {toxicity.level}{toxicity.affected ? ` (${toxicity.affected})` : ''}</Text>
        </View>
      )}
      {toxicity && toxicity.symptoms && (
        <View style={styles.infoRow}>
          <Ionicons name="alert-circle" size={16} color="#E65100" />
          <Text style={styles.infoText}>Symptoms: {toxicity.symptoms}</Text>
        </View>
      )}
      {toxicity && toxicity.firstAid && (
        <View style={styles.infoRow}>
          <Ionicons name="medkit" size={16} color="#1976D2" />
          <Text style={styles.infoText}>First Aid: {toxicity.firstAid}</Text>
        </View>
      )}
      {funFacts && funFacts.length > 0 && (
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={16} color="#43A047" />
          <Text style={styles.infoText}>Fun Facts:</Text>
        </View>
      )}
      {funFacts && funFacts.length > 0 && funFacts.map((fact, idx) => (
        <Text key={idx} style={styles.bulletText}>• {fact}</Text>
      ))}
      {commonUses && commonUses.length > 0 && (
        <View style={styles.infoRow}>
          <Ionicons name="flask" size={16} color="#6D4C41" />
          <Text style={styles.infoText}>Common Uses:</Text>
        </View>
      )}
      {commonUses && commonUses.length > 0 && commonUses.map((use, idx) => (
        <Text key={idx} style={styles.bulletText}>• {use}</Text>
      ))}
      {ecologicalRole && (
        <View style={styles.infoRow}>
          <Ionicons name="leaf-outline" size={16} color="#388E3C" />
          <Text style={styles.infoText}>Ecological Role: {ecologicalRole}</Text>
        </View>
      )}
      {culturalUses && (
        <View style={styles.infoRow}>
          <Ionicons name="people" size={16} color="#8E24AA" />
          <Text style={styles.infoText}>Cultural Uses: {culturalUses}</Text>
        </View>
      )}
      {historicalUses && (
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#0277BD" />
          <Text style={styles.infoText}>Historical Uses: {historicalUses}</Text>
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
  bulletText: {
    marginLeft: 24,
    color: '#666',
    fontSize: 13,
    marginBottom: 2,
  },
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
