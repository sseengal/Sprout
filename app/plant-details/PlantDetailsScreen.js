import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PlantDetailsScreen = () => {
  const { plantData, imageUri } = useLocalSearchParams();
  const router = useRouter();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [careInfo, setCareInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // Extract plant information
  useEffect(() => {
    const loadPlantData = async () => {
      try {
        const parsedData = plantData ? JSON.parse(plantData) : null;
        if (!parsedData) throw new Error('No plant data available');
        
        setPlant(parsedData);
        extractCareInfo(parsedData);
      } catch (err) {
        console.error('Error loading plant data:', err);
        setError(err.message || 'Failed to load plant data');
        Alert.alert('Error', 'Failed to load plant details');
      } finally {
        setLoading(false);
      }
    };

    const extractCareInfo = (plantData) => {
      if (!plantData) return null;
      
      // Try to get data from House Plants API first
      if (plantData.housePlantData) {
        const { housePlantData } = plantData;
        setCareInfo({
          tips: housePlantData.careTips || [],
          source: 'House Plants API',
          temperature: housePlantData.temperature,
          light: housePlantData.light,
          watering: housePlantData.watering,
          scientificName: housePlantData.scientificName,
          family: housePlantData.family,
          origin: housePlantData.origin
        });
      } 
      // Fallback to PlantNet data
      else if (plantData.suggestions?.[0]?.plant_details?.wiki_description?.value) {
        const suggestion = plantData.suggestions[0];
        setCareInfo({
          tips: [suggestion.plant_details.wiki_description.value],
          source: 'PlantNet',
          scientificName: suggestion.plant_details.scientific_name
        });
      }
      // Default care tips
      else {
        setCareInfo({
          tips: [
            'Place in bright, indirect sunlight.',
            'Water when the top inch of soil is dry.',
            'Use well-draining potting mix.',
            'Maintain room temperature between 65-75°F (18-24°C).',
            'Mist leaves occasionally for humidity.'
          ],
          source: 'General Plant Care Tips'
        });
      }
    };

    loadPlantData();
  }, [plantData]);

  // Get plant name from the first suggestion or House Plant data
  const getPlantName = () => {
    if (plant?.housePlantData?.name) return plant.housePlantData.name;
    if (plant?.suggestions?.[0]?.plant_name) return plant.suggestions[0].plant_name;
    return 'Unknown Plant';
  };

  // Get scientific name if available
  const getScientificName = () => {
    if (plant?.housePlantData?.scientificName) return plant.housePlantData.scientificName;
    if (plant?.suggestions?.[0]?.plant_details?.scientific_name) {
      return plant.suggestions[0].plant_details.scientific_name;
    }
    return null;
  };

  // Get confidence percentage
  const getConfidence = () => {
    if (plant?.suggestions?.[0]?.probability) {
      return Math.round(plant.suggestions[0].probability * 100);
    }
    return null;
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // Render error state
  if (error || !plant) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error || 'No plant data available'}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render plant details
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plant Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container}>
        {/* Plant Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUri || 'https://via.placeholder.com/300x300?text=No+Image' }} 
            style={styles.plantImage}
            resizeMode="cover"
          />
        </View>

        {/* Plant Name and Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.plantName}>{getPlantName()}</Text>
          
          {getScientificName() && (
            <Text style={styles.scientificName}>
              {getScientificName()}
            </Text>
          )}
          
          {getConfidence() && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>
                Confidence: {getConfidence()}%
              </Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
              Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'care' && styles.activeTab]}
            onPress={() => setActiveTab('care')}
          >
            <Text style={[styles.tabText, activeTab === 'care' && styles.activeTabText]}>
              Care Guide
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'details' ? (
            <View>
              {careInfo?.family && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Family:</Text>
                  <Text style={styles.infoText}>{careInfo.family}</Text>
                </View>
              )}
              
              {careInfo?.origin && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Origin:</Text>
                  <Text style={styles.infoText}>{careInfo.origin}</Text>
                </View>
              )}
              
              {careInfo?.source && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Source:</Text>
                  <Text style={styles.infoText}>{careInfo.source}</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Light Requirements */}
              {careInfo?.light?.ideal && (
                <View style={styles.careItem}>
                  <MaterialIcons name="wb-sunny" size={24} color="#FFA000" style={styles.careIcon} />
                  <View style={styles.careTextContainer}>
                    <Text style={styles.careTitle}>Light Requirements</Text>
                    <Text style={styles.careText}>{careInfo.light.ideal}</Text>
                    {careInfo.light.tolerated && (
                      <Text style={[styles.careText, styles.smallText]}>
                        Tolerates: {careInfo.light.tolerated}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Watering */}
              {(careInfo?.watering?.summer || careInfo?.watering?.winter) && (
                <View style={styles.careItem}>
                  <MaterialIcons name="opacity" size={24} color="#2196F3" style={styles.careIcon} />
                  <View style={styles.careTextContainer}>
                    <Text style={styles.careTitle}>Watering</Text>
                    {careInfo.watering?.summer && (
                      <Text style={styles.careText}>🌞 Summer: {careInfo.watering.summer}</Text>
                    )}
                    {careInfo.watering?.winter && (
                      <Text style={styles.careText}>❄️ Winter: {careInfo.watering.winter}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Temperature */}
              {(careInfo?.temperature?.min || careInfo?.temperature?.max) && (
                <View style={styles.careItem}>
                  <MaterialIcons name="thermostat" size={24} color="#F44336" style={styles.careIcon} />
                  <View style={styles.careTextContainer}>
                    <Text style={styles.careTitle}>Temperature</Text>
                    <Text style={styles.careText}>
                      {careInfo.temperature?.min && `Min: ${careInfo.temperature.min}°C`}
                      {careInfo.temperature?.min && careInfo.temperature?.max && ' • '}
                      {careInfo.temperature?.max && `Max: ${careInfo.temperature.max}°C`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Additional Care Tips */}
              {careInfo?.tips?.map((tip, index) => (
                <View key={`tip-${index}`} style={styles.careItem}>
                  <MaterialIcons name="eco" size={24} color="#4CAF50" style={styles.careIcon} />
                  <Text style={[styles.careText, styles.careTip]}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    backgroundColor: '#f5f5f5',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: 16,
  },
  plantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  confidenceContainer: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  careItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  careIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  careTextContainer: {
    flex: 1,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  careText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  careTip: {
    flex: 1,
  },
  smallText: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
});

export default PlantDetailsScreen;
