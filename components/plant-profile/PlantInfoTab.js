import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CareInstructionsSection from '../plant/CareInstructionsSection';
import PlantInfoSection from '../plant/PlantInfoSection';
import { getFormattedPlantData } from '../../utils/plantDataFormatter';
import PlantDataDebug from './PlantDataDebug';

export default function PlantInfoTab({ plant }) {
  // Get raw plant data for debugging
  const rawPlantData = plant?.plantData || {};
  const rawGeminiInfo = rawPlantData?.geminiInfo || {};
  
  // Format all plant data using our utility function
  const formattedData = getFormattedPlantData(plant);
  const hasGeminiInfo = plant?.plantData?.geminiInfo;
  
  // Function to render additional info with proper formatting
  const renderAdditionalInfo = () => {
    if (!formattedData.additionalInfo) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        {formattedData.additionalInfo.split('\n').map((line, index) => (
          <Text key={index} style={[styles.sectionText, 
            line.startsWith('•') ? styles.bulletItem : null,
            line.startsWith('🌿') || line.startsWith('🌱') ? styles.sectionSubtitle : null
          ]}>
            {line}
          </Text>
        ))}
      </View>
    );
  };
  
  // Create a simplified plant details object that matches what PlantInfoSection expects
  const createSimplifiedDetails = () => {
    const details = rawPlantData;
    const geminiInfo = rawGeminiInfo;
    
    return {
      scientificName: details.scientificName || '',
      family: details.family || geminiInfo.family || '',
      genus: details.genus || geminiInfo.genus || '',
      origin: details.origin || geminiInfo.origin || '',
      growthRate: details.growthRate || geminiInfo.growthRate || '',
      matureSize: details.matureSize || geminiInfo.matureSize || {},
      toxicity: details.toxicity || geminiInfo.toxicity || {},
      funFacts: Array.isArray(details.funFacts || geminiInfo.funFacts) 
        ? (details.funFacts || geminiInfo.funFacts) 
        : [],
      commonUses: Array.isArray(details.commonUses || geminiInfo.commonUses) 
        ? (details.commonUses || geminiInfo.commonUses) 
        : [],
      ecologicalRole: details.ecologicalRole || geminiInfo.ecologicalRole || '',
      culturalUses: details.culturalUses || geminiInfo.culturalUses || '',
      historicalUses: details.historicalUses || geminiInfo.historicalUses || '',
      wikiUrl: details.wikiUrl || geminiInfo.wikiUrl || ''
    };
  };
  
  // Extract care instructions directly from the raw data
  const extractCareInstructions = () => {
    const careInstructions = rawGeminiInfo.careInstructions || {};
    
    // If careInstructions is a string, convert it to an object
    if (typeof careInstructions === 'string') {
      return {
        careDetails: {},
        careTips: [careInstructions]
      };
    }
    
    // Handle different structures
    let careDetails = {};
    let careTips = [];
    
    // Direct access to details and tips
    if (careInstructions.details) {
      careDetails = careInstructions.details;
    }
    
    // Check for common care fields at the top level
    const careFields = [
      'watering', 'light', 'temperature', 'humidity', 'soil',
      'feeding', 'maintenance', 'seasonalCare', 'commonIssues', 'propagation'
    ];
    
    careFields.forEach(field => {
      if (careInstructions[field]) {
        careDetails[field] = careInstructions[field];
      }
    });
    
    // Get tips
    if (Array.isArray(careInstructions.tips)) {
      careTips = careInstructions.tips;
    } else if (typeof careInstructions.tips === 'string') {
      careTips = [careInstructions.tips];
    }
    
    return { careDetails, careTips };
  };
  
  const plantDetails = createSimplifiedDetails();
  const { careDetails, careTips } = extractCareInstructions();
  
  return (
    <View style={styles.container}>
      {hasGeminiInfo ? (
        <ScrollView>
          <View style={styles.infoContainer}>
            <Text style={styles.scientificName}>
              {plantDetails.scientificName || 'Scientific name not available'}
            </Text>
            
            {/* Plant Info Section */}
            <PlantInfoSection {...plantDetails} />
            
            {/* Care Instructions */}
            <CareInstructionsSection 
              careDetails={careDetails} 
              careTips={careTips} 
            />
            
            {/* Additional Info */}
            {renderAdditionalInfo()}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="info" size={64} color="#e0e0e0" />
          <Text style={[styles.sectionTitle, {textAlign: 'center'}]}>No Plant Information</Text>
          <Text style={styles.emptyText}>
            Detailed information about this plant is not available.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  infoContainer: {
    marginBottom: 20,
  },
  scientificName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
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
    marginBottom: 12,
    color: '#1B5E20',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
    marginBottom: 4,
  },
  bulletItem: {
    paddingLeft: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 10,
  },
});
