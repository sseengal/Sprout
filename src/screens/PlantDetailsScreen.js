import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlantDetailsScreen({ route, navigation }) {
  const { plantData } = route.params || {};
  const { plant_name, plant_details, careTips = [] } = plantData || {};
  
  // Fallback data in case the API doesn't return all fields
  const plantInfo = {
    commonName: plant_name || 'Unknown Plant',
    scientificName: Array.isArray(plant_details?.scientific_name) 
      ? plant_details.scientific_name[0] 
      : (plant_details?.scientific_name || 'Not available'),
    family: plant_details?.taxonomy?.family || 'Not available',
    genus: plant_details?.taxonomy?.genus || 'Not available',
    wikiUrl: plant_details?.url || null,
    probability: plantData?.probability ? Math.round(plantData.probability * 100) : 0,
    
    // Care information from the API or default values
    careTips: {
      watering: plant_details?.care_tips?.find(tip => 
        tip.toLowerCase().includes('water') || 
        tip.toLowerCase().includes('moist')
      ) || 'Water when the top inch of soil is dry.',
      
      sunlight: plant_details?.care_tips?.find(tip => 
        tip.toLowerCase().includes('light') || 
        tip.toLowerCase().includes('sun')
      ) || 'Prefers bright, indirect light.',
      
      temperature: plant_details?.care_tips?.find(tip => 
        tip.toLowerCase().includes('temperature') || 
        tip.toLowerCase().includes('warm')
      ) || 'Prefers temperatures between 65-80°F (18-27°C).',
      
      // Use the careTips array if available
      ...(careTips.length > 0 && {
        customTips: careTips
      })
    }
  };

  const openWikiPage = () => {
    if (plantInfo.wikiUrl) {
      Linking.openURL(plantInfo.wikiUrl);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.title}>{plantInfo.commonName}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {plantInfo.probability}% Match
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scientific Name</Text>
          <Text style={styles.sectionContent}>{plantInfo.scientificName}</Text>
          
          {plantInfo.family !== 'Not available' && (
            <View style={styles.infoRow}>
              <Ionicons name="leaf" size={16} color="#666" />
              <Text style={styles.infoText}>Family: {plantInfo.family}</Text>
            </View>
          )}
          
          {plantInfo.genus !== 'Not available' && (
            <View style={styles.infoRow}>
              <Ionicons name="leaf" size={16} color="#666" />
              <Text style={styles.infoText}>Genus: {plantInfo.genus}</Text>
            </View>
          )}
          
          {plantInfo.wikiUrl && (
            <TouchableOpacity 
              style={styles.wikiButton}
              onPress={openWikiPage}
            >
              <Ionicons name="open-outline" size={16} color="#4CAF50" />
              <Text style={styles.wikiButtonText}>View on Wikipedia</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care Instructions</Text>
          
          {plantInfo.careTips.watering && (
            <View style={styles.careItem}>
              <Ionicons name="water" size={20} color="#2196F3" />
              <View style={styles.careTextContainer}>
                <Text style={styles.careTitle}>Watering</Text>
                <Text style={styles.careDescription}>{plantInfo.careTips.watering}</Text>
              </View>
            </View>
          )}
          
          {plantInfo.careTips.sunlight && (
            <View style={styles.careItem}>
              <Ionicons name="sunny" size={20} color="#FFC107" />
              <View style={styles.careTextContainer}>
                <Text style={styles.careTitle}>Sunlight</Text>
                <Text style={styles.careDescription}>{plantInfo.careTips.sunlight}</Text>
              </View>
            </View>
          )}
          
          {plantInfo.careTips.temperature && (
            <View style={styles.careItem}>
              <Ionicons name="thermometer" size={20} color="#F44336" />
              <View style={styles.careTextContainer}>
                <Text style={styles.careTitle}>Temperature</Text>
                <Text style={styles.careDescription}>{plantInfo.careTips.temperature}</Text>
              </View>
            </View>
          )}
          
          {plantInfo.careTips.customTips && plantInfo.careTips.customTips.length > 0 && (
            <View style={styles.careItem}>
              <Ionicons name="list" size={20} color="#4CAF50" />
              <View style={styles.careTextContainer}>
                <Text style={styles.careTitle}>Care Tips</Text>
                {plantInfo.careTips.customTips.map((tip, index) => (
                  <Text key={index} style={[styles.careDescription, { marginTop: index > 0 ? 5 : 0 }]}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.careItem}>
            <Ionicons name="thermometer" size={20} color="#F44336" />
            <View style={styles.careTextContainer}>
              <Text style={styles.careTitle}>Temperature</Text>
              <Text style={styles.careDescription}>{plantInfo.careTips.temperature}</Text>
            </View>
          </View>
          
          <View style={styles.careItem}>
            <Ionicons name="cloudy" size={20} color="#03A9F4" />
            <View style={styles.careTextContainer}>
              <Text style={styles.careTitle}>Humidity</Text>
              <Text style={styles.careDescription}>{plantInfo.careTips.humidity}</Text>
            </View>
          </View>
          
          <View style={styles.careItem}>
            <Ionicons name="nutrition" size={20} color="#8BC34A" />
            <View style={styles.careTextContainer}>
              <Text style={styles.careTitle}>Fertilizer</Text>
              <Text style={styles.careDescription}>{plantInfo.careTips.fertilizer}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.noteText}>
            Note: These care instructions are general guidelines. Your plant's needs may vary based on its environment.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => Alert.alert('Save Plant', 'This feature will be implemented soon!')}
        >
          <Ionicons name="bookmark" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save to My Plants</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7f0',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
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
