import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AnalysisContent from '../../components/analysis/AnalysisContent';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';
import { getAvailableCredits, useAnalysis } from '../../lib/analysisCredits';
import { getPlantInfo } from '../../utils/geminiService';
import { extractPlantInfo } from '../../utils/plantDetails';

export default function AnalysisScreen() {
  const searchParams = useLocalSearchParams();
  const router = useRouter();
  let plantData, imageUri, isTextSearch = false, plantName;
  if (searchParams && searchParams.plantData) {
    try {
      // Only parse if plantData is a string that looks like JSON
      if (typeof searchParams.plantData === 'string' && searchParams.plantData.trim().startsWith('{')) {
        const parsed = JSON.parse(searchParams.plantData);
        
        // Check if this is a text-based search
        if (parsed && parsed.textSearch) {
          isTextSearch = true;
          plantName = searchParams.plantName;
          plantData = { textSearch: true };
        } else if (parsed && parsed.plantData) {
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
  const [plantImageUrl, setPlantImageUrl] = useState('');
  const { user } = useAuth();
  const [credits, setCredits] = useState({ total: 0, trial: 0, subscription: 0, purchase: 0 });
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  
  // Reset state when component mounts or unmounts
  useEffect(() => {
    // Clear state when component mounts
    if (!searchParams?.isSavedView) {
      setGeminiInfo(null);
      setGeminiPlantName('');
      setGeminiError(null);
      setPlantImageUrl('');
    }
    
    // Return cleanup function to clear state when component unmounts
    return () => {
      setGeminiInfo(null);
      setGeminiPlantName('');
      setGeminiError(null);
      setPlantImageUrl('');
    };
  }, []);

  // Helper: get top PlantNet suggestion name
  const getPlantNetTopName = () => {
    if (Array.isArray(plantData?.suggestions) && plantData.suggestions.length > 0) {
      return plantData.suggestions[0].plant_name || '';
    }
    return '';
  };

  // Disease detection functionality has been disabled
  const fetchPlantHealthData = async () => {
    // Function disabled - no longer making API calls for plant health analysis
    return;
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
      
      // Handle text-based search differently
      if (isTextSearch && plantName) {
        try {
          setGeminiPlantName(plantName);
          
          // Skip PlantNet and directly use Gemini API
          const info = await getPlantInfo(plantName);
          setGeminiInfo(info);
          
          // Fetch a random plant image from Unsplash
          try {
            // Create a safe search term by removing any special characters
            const searchTerm = plantName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
            // Use Unsplash source for a random plant image
            const imageUrl = `https://source.unsplash.com/featured/?${searchTerm},plant`;
            setPlantImageUrl(imageUrl);
          } catch (imageError) {
            console.error('Error fetching plant image:', imageError);
            // Use a default plant image if fetching fails
            setPlantImageUrl('https://source.unsplash.com/featured/?plant');
          }
          
          // Track analysis if user is logged in
          if (user) {
            try {
              await useAnalysis(user.id);
              const newCredits = await getAvailableCredits(user.id);
              setCredits(newCredits);
            } catch (error) {
              console.error('Error recording text search analysis:', error);
            }
          }
          
          setGeminiLoading(false);
          return;
        } catch (error) {
          console.error('Error in text-based plant search:', error);
          
          // Check if this is a model overload error
          const errorMessage = error.message || '';
          if (errorMessage.includes('model is overloaded') || errorMessage.includes('503')) {
            setGeminiError('The AI service is currently busy. Please try again in a few moments.');
          } else {
            setGeminiError(errorMessage || 'Failed to get plant information');
          }
          
          setGeminiLoading(false);
          return;
        }
      }

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
  }, [searchParams?.plantData, searchParams?.imageUri, searchParams?.plantName, searchParams?.isSavedView]);

  // Disease detection functionality has been disabled
  // useEffect for fetchPlantHealthData removed

  // Only show plant info if we have Gemini data
  // Extract plant info and ensure common name is set for text-based searches
  let plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
  
  // For text-based searches, ensure the common name is set to the search term if not already set
  if (plantInfo && isTextSearch && plantName && !plantInfo.commonName) {
    plantInfo = {
      ...plantInfo,
      commonName: plantName
    };
  }
  const plantId = plantInfo ? ((plantData && plantData.id) || (imageUri ? imageUri : '') + (plantInfo.scientificName || '')) : '';
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
      setSaved(false); // Update the saved state
      Toast.show({
        type: 'info',
        text1: 'Plant removed',
        text2: plantInfo.commonName || 'Plant has been removed from your collection',
        position: 'top',
        visibilityTime: 2000,
      });
    } else {
      // Handle saving differently based on search type
      if (isTextSearch) {
        // For text-based searches, use the plant name directly
        addPlant({
          plantData: {
            textSearch: true,
            commonName: plantInfo.commonName || plantName,
            scientificName: plantInfo.scientificName || '',
            geminiInfo: geminiInfo // Save the Gemini info for later use
          },
          imageUri: plantImageUrl, // Use the fetched image URL for text-based searches
          id: plantId,
          savedAt: Date.now(),
          searchType: 'text'
        });
      } else {
        console.log('DEBUG: Saving plantData:', JSON.stringify(plantData, null, 2));
        // Extract names from the suggestions array for image-based searches
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
          searchType: 'image'
        });
      }
      setSaved(true); // Update the saved state
      Toast.show({
        type: 'info',
        text1: 'Plant saved',
        text2: plantInfo.commonName || 'Plant has been added to your collection',
        position: 'top',
        visibilityTime: 2000,
      });
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

  if (!plantData) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="science" size={64} color="#DDD" />
        <Text style={styles.emptyText}>No plant analysis yet</Text>
        <Text style={styles.emptySubtext}>Start a new analysis by capturing a plant image or select a saved plant from 'My Plants'.</Text>
      </View>
    );
  }
  
  // Function to retry text-based search
  const handleRetryTextSearch = async () => {
    if (isTextSearch && plantName) {
      await handlePlantAnalysis();
    }
  };

  return (
    <AnalysisContent
      imageUri={isTextSearch ? plantImageUrl : imageUri}
      plantData={plantData}
      plantInfo={plantInfo}
      handleToggleSave={handleToggleSave}
      saved={saved} // Pass the saved state to AnalysisContent
      geminiLoading={geminiLoading}
      geminiError={geminiError}
      isTextSearch={isTextSearch}
      onRetry={handleRetryTextSearch}
      // Plant.ID related props removed - disease detection disabled
      // plantIdLoading={plantIdLoading}
      // plantIdError={plantIdError}
      // plantIdData={plantIdData}
      // fetchPlantHealthData={fetchPlantHealthData}
      credits={credits}
      isLoadingCredits={isLoadingCredits}
    />
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
