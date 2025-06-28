import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CareInstructionsSection from '../../components/plant/CareInstructionsSection';
import ConfidenceBadge from '../../components/plant/ConfidenceBadge';
import NoteContainer from '../../components/plant/NoteContainer';
import PlantInfoSection from '../../components/plant/PlantInfoSection';
import SaveButton from '../../components/plant/SaveButton';
import { analyzePlantHealth } from '../services/apiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAvailableCredits, useAnalysis } from '../../lib/analysisCredits';
import { extractPlantInfo } from '../../utils/plantDetails';

import { getPlantInfo } from '../../utils/geminiService';

export default function AnalysisScreen() {
  const searchParams = useLocalSearchParams();
  let plantData, imageUri;
  if (searchParams && searchParams.plantData) {
    try {
      // Only parse if plantData is a string that looks like JSON
      if (typeof searchParams.plantData === 'string' && searchParams.plantData.trim().startsWith('{')) {
        const parsed = JSON.parse(searchParams.plantData);
        if (parsed && parsed.plantData) {
          plantData = parsed.plantData;
          imageUri = parsed.imageUri;
        } else {
          plantData = parsed;
          imageUri = searchParams.imageUri;
        }
      } else {
        plantData = searchParams.plantData;
        imageUri = searchParams.imageUri;
      }
    } catch {
      plantData = searchParams.plantData;
      imageUri = searchParams.imageUri;
    }
  }

  if (!plantData) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="science" size={64} color="#DDD" />
        <Text style={styles.emptyText}>No plant analysis yet</Text>
        <Text style={styles.emptySubtext}>Start a new analysis by capturing a plant image or select a saved plant from 'My Plants'.</Text>
      </View>
    );
  }

  // Local state for Gemini info, loading, error, and plant name used
  const [geminiInfo, setGeminiInfo] = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(null);
  const [plantIdData, setPlantIdData] = useState(null);
  const [plantIdLoading, setPlantIdLoading] = useState(false);
  const [plantIdError, setPlantIdError] = useState(null);
  const [geminiPlantName, setGeminiPlantName] = useState('');
  const { user } = useAuth();
  const [credits, setCredits] = useState({ total: 0, trial: 0, subscription: 0, purchase: 0 });
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // Helper: get top PlantNet suggestion name
  const getPlantNetTopName = () => {
    if (Array.isArray(plantData?.suggestions) && plantData.suggestions.length > 0) {
      return plantData.suggestions[0].plant_name || '';
    }
    return '';
  };

  const fetchPlantHealthData = async () => {
    if (!imageUri) return;
    
    try {
      setPlantIdLoading(true);
      setPlantIdError(null);
      const healthData = await analyzePlantHealth(imageUri);
      setPlantIdData(healthData);
    } catch (error) {
      console.error('Error fetching plant health data:', error);
      setPlantIdError(error.message || 'Failed to analyze plant health');
    } finally {
      setPlantIdLoading(false);
    }
  };

  // Handle plant analysis on mount/plant change
  useEffect(() => {
    const handlePlantAnalysis = async () => {
      // Skip if this is a saved view
      if (searchParams?.isSavedView) {
        // Use the saved Gemini info if available
        if (searchParams.savedGeminiInfo) {
          setGeminiInfo(JSON.parse(searchParams.savedGeminiInfo));
        } else {
          setGeminiError('No saved plant information available.');
        }
        setGeminiLoading(false);
        return;
      }

      // This is a new analysis - proceed with API calls
      setGeminiLoading(true);
      setGeminiError(null);
      setPlantInfo(null);

      try {
        const plantName = getPlantNetTopName();
        setGeminiPlantName(plantName);

        if (!plantName) {
          setGeminiError('Could not determine a valid plant name from PlantNet. Please try another image.');
          return;
        }

        // Only record analysis for new identifications
        if (user?.id) {
          try {
            // Check if user has enough credits
            const creditCheck = await useAnalysis(user.id);
            if (creditCheck.total <= 0) {
              Alert.alert(
                'Limit Reached', 
                'You\'ve used all your available analyses. Please upgrade your plan for more.',
                [{ text: 'OK' }]
              );
              setGeminiLoading(false);
              return;
            }

            // Record the analysis
            const result = await useAnalysis(user.id);
            
            // Update local credits state
            if (result.success) {
              const newCredits = await useAnalysis(user.id);
              setCredits(newCredits);
            }
          } catch (error) {
            console.error('Error recording analysis:', error);
            if (error?.error === 'ANALYSIS_LIMIT_REACHED') {
              Alert.alert(
                'Limit Reached', 
                `You've used all your monthly analyses. ${error.message}`,
                [{ text: 'OK' }]
              );
              setGeminiLoading(false);
              return;
            }
          }
        }

        // Only fetch Gemini info if we don't have it already
        const info = await getPlantInfo(plantName);
        if (!info || Object.keys(info).length === 0) {
          setGeminiError('No detailed plant information could be found for this analysis.');
          setGeminiInfo(null);
          return;
        }
        setGeminiInfo(info);
      } catch (err) {
        setGeminiError(err.message || 'Failed to fetch plant information');
        setGeminiInfo(null);
      } finally {
        setGeminiLoading(false);
      }
    };

    handlePlantAnalysis();
  }, [plantData && plantData.suggestions && plantData.suggestions[0]?.plant_name, searchParams?.isSavedView]);

  useEffect(() => {
    if (imageUri) {
      fetchPlantHealthData();
    }
  }, [imageUri]);

  // Only show plant info if we have Gemini data
  const plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
  const plantId = plantInfo ? ((plantData && plantData.id) || (imageUri ? imageUri : '') + (plantInfo.scientificName || '')) : '';
  const router = useRouter();
  const { addPlant, removePlant, isPlantSaved } = useSavedPlants();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (plantInfo) {
      setSaved(isPlantSaved({ id: plantId, imageUri, scientificName: plantInfo.scientificName }));
    }
  }, [isPlantSaved, plantId, imageUri, plantInfo && plantInfo.scientificName]);

  const handleToggleSave = () => {
    if (!plantInfo) return;
    if (saved) {
      removePlant(plantId);
      Alert.alert('Removed', 'This plant has been removed from your collection.');
    } else {
      console.log('DEBUG: Saving plantData:', JSON.stringify(plantData, null, 2));
      // Extract names from the suggestions array
      let commonName = '';
      let scientificName = '';
      if (
        plantData.suggestions &&
        plantData.suggestions.length > 0 &&
        plantData.suggestions[0].plant_details
      ) {
        const details = plantData.suggestions[0].plant_details;
        commonName = Array.isArray(details.common_names) && details.common_names.length > 0
          ? details.common_names[0]
          : '';
        scientificName = details.scientific_name || '';
      }
      addPlant({
        plantData: {
          ...plantData,
          commonName,
          scientificName,
          geminiInfo: geminiInfo // Save the Gemini info for later use
        },
        imageUri: imageUri || '',
        id: plantId,
        savedAt: Date.now(),
      });
      Alert.alert('Plant Saved', 'This plant has been added to your collection!');
    }
  };

  // Load credits on mount and when user changes
  useEffect(() => {
    const loadCredits = async () => {
      if (!user?.id) return;
      
      setIsLoadingCredits(true);
      try {
        const creditData = await getAvailableCredits(user.id);
        setCredits(creditData);
      } catch (error) {
        console.error('Error loading credits:', error);
      } finally {
        setIsLoadingCredits(false);
      }
    };

    loadCredits();
  }, [user?.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }} edges={['top']}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={styles.headerContainer}>
          <View style={styles.usageContainer}>
            <Text style={styles.usageLabel}>Analyses Left</Text>
            <Text style={styles.usageCount}>
              {!isLoadingCredits ? credits.total : '...'}
            </Text>
            {credits.total === 0 && (
              <Text style={styles.upgradeText}>
                Upgrade for more analyses
              </Text>
            )}
          </View>
        </View>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : null}
        {plantInfo && (
          <View style={{ marginBottom: 12 }}>
            {/* Common Name (from Gemini, else PlantNet) */}
            <Text style={[styles.commonName, { textAlign: 'center', marginBottom: 0 }]}>
              {plantInfo.commonName || (plantData?.suggestions && plantData.suggestions[0]?.plant_details?.common_names?.[0]) || ''}
            </Text>
            {/* Scientific Name */}
            {plantInfo.scientificName ? (
              <Text style={[styles.scientificName, { textAlign: 'center' }]}>{plantInfo.scientificName}</Text>
            ) : null}
            {/* Confidence badge and Save button in same row */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              {(plantData?.suggestions && plantData.suggestions[0]?.probability > 0) && (
                <View style={{ marginRight: 16 }}>
                  <ConfidenceBadge probability={Math.round(plantData.suggestions[0].probability * 100)} />
                </View>
              )}
              <SaveButton saved={saved} label={saved ? 'Saved' : 'Save'} onPress={handleToggleSave} />
            </View>
          </View>
        )}
        {geminiLoading && (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{ color: '#888', fontSize: 15 }}>Fetching detailed plant info...</Text>
          </View>
        )}
        {geminiError && (
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <Text style={{ color: '#D32F2F', fontSize: 14 }}>Gemini Error: {geminiError}</Text>
          </View>
        )}
        {plantInfo ? (
          <>
            <PlantInfoSection
              scientificName={plantInfo.scientificName}
              family={plantInfo.family}
              genus={plantInfo.genus}
              origin={plantInfo.origin}
              growthRate={plantInfo.growthRate}
              matureSize={plantInfo.matureSize}
              toxicity={plantInfo.toxicity}
              funFacts={plantInfo.funFacts}
              commonUses={plantInfo.commonUses}
              ecologicalRole={plantInfo.ecologicalRole}
              culturalUses={plantInfo.culturalUses}
              historicalUses={plantInfo.historicalUses}
              wikiUrl={plantInfo.wikiUrl}
            />
            <CareInstructionsSection careTips={plantInfo.careTips} careDetails={plantInfo.careDetails} />
            
            {/* PLANT.ID Section */}
            <View style={styles.plantIdSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="science" size={20} color="#2E7D32" />
                <Text style={styles.sectionTitle}>PLANT.ID Analysis</Text>
              </View>
              <View style={styles.plantIdContent}>
                {plantIdLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Analyzing plant health...</Text>
                  </View>
                ) : plantIdError ? (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={24} color="#D32F2F" />
                    <Text style={styles.errorText}>{plantIdError}</Text>
                    <TouchableOpacity 
                      style={styles.retryButton} 
                      onPress={fetchPlantHealthData}
                    >
                      <Text style={styles.retryButtonText}>Retry Analysis</Text>
                    </TouchableOpacity>
                  </View>
                ) : plantIdData ? (
                  <View>
                    <View style={styles.healthStatusContainer}>
                      <MaterialIcons 
                        name={plantIdData.isHealthy ? "check-circle" : "warning"} 
                        size={24} 
                        color={plantIdData.isHealthy ? "#4CAF50" : "#FFC107"} 
                      />
                      <Text style={[styles.healthStatusText, { color: plantIdData.isHealthy ? "#4CAF50" : "#FFC107" }]}>
                        {plantIdData.isHealthy ? "Plant appears healthy" : "Health issues detected"}
                      </Text>
                    </View>
                    
                    {!plantIdData.isHealthy && plantIdData.diseases && plantIdData.diseases.length > 0 ? (
                      <View style={styles.diseasesContainer}>
                        {plantIdData.diseases.map((disease, index) => (
                          <View key={index} style={styles.diseaseItem}>
                            <View style={styles.diseaseHeader}>
                              <Text style={styles.diseaseName}>{disease.name}</Text>
                              <View style={styles.probabilityBadge}>
                                <Text style={styles.probabilityText}>
                                  {Math.round(disease.probability * 100)}%
                                </Text>
                              </View>
                            </View>
                            
                            <Text style={styles.diseaseDescription}>{disease.description}</Text>
                            
                            <View style={styles.treatmentSection}>
                              <Text style={styles.treatmentTitle}>Treatment Options:</Text>
                              
                              {disease.treatment.prevention && (
                                <View style={styles.treatmentItem}>
                                  <Text style={styles.treatmentType}>Prevention:</Text>
                                  <Text style={styles.treatmentText}>{disease.treatment.prevention}</Text>
                                </View>
                              )}
                              
                              {disease.treatment.biological && (
                                <View style={styles.treatmentItem}>
                                  <Text style={styles.treatmentType}>Biological:</Text>
                                  <Text style={styles.treatmentText}>{disease.treatment.biological}</Text>
                                </View>
                              )}
                              
                              {disease.treatment.chemical && (
                                <View style={styles.treatmentItem}>
                                  <Text style={styles.treatmentType}>Chemical:</Text>
                                  <Text style={styles.treatmentText}>{disease.treatment.chemical}</Text>
                                </View>
                              )}
                            </View>
                            
                            {disease.similarImages && disease.similarImages.length > 0 && (
                              <View style={styles.similarImagesSection}>
                                <Text style={styles.similarImagesTitle}>Similar Cases:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarImagesScroll}>
                                  {disease.similarImages.slice(0, 3).map((imageUrl, imgIndex) => (
                                    <Image 
                                      key={imgIndex} 
                                      source={{ uri: imageUrl }} 
                                      style={styles.similarImage} 
                                      resizeMode="cover"
                                    />
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : plantIdData.isHealthy ? (
                      <Text style={styles.healthyMessage}>
                        No signs of disease detected. Continue with regular care.
                      </Text>
                    ) : (
                      <Text style={styles.noDataMessage}>
                        No specific disease information available.
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.plantIdPlaceholder}>
                    Detailed plant disease analysis will be shown here
                  </Text>
                )}
              </View>
            </View>
          </>
        ) : geminiError ? (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{ color: '#D32F2F', fontSize: 15 }}>{geminiError}</Text>
          </View>
        ) : null}
        <NoteContainer />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  usageContainer: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    minWidth: 120,
    justifyContent: 'space-between',
  },
  usageLabel: {
    fontSize: 14,
    color: '#2e7d32',
    marginRight: 6,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    minWidth: 24,
    textAlign: 'center',
    marginLeft: 4,
  },
  upgradeText: {
    fontSize: 12,
    color: '#ff6d00',
    marginLeft: 8,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  plantIdSection: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  plantIdContent: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  plantIdPlaceholder: {
    color: '#6c757d',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 15,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  diseasesContainer: {
    marginTop: 8,
  },
  diseaseItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  probabilityBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  probabilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  diseaseDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  treatmentSection: {
    marginTop: 8,
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  treatmentItem: {
    marginBottom: 8,
  },
  treatmentType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    marginBottom: 4,
  },
  treatmentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  similarImagesSection: {
    marginTop: 12,
  },
  similarImagesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  similarImagesScroll: {
    flexDirection: 'row',
  },
  similarImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  healthyMessage: {
    fontSize: 15,
    color: '#4CAF50',
    textAlign: 'center',
    padding: 16,
  },
  noDataMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
  commonName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 12,
  },
});
