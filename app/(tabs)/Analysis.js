import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Image } from 'react-native';
import { analysisStyles as styles } from '../../styles/analysisStyles';
import Toast from 'react-native-toast-message';
import AnalysisContent from '../../components/analysis/AnalysisContent';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';
import { getAvailableCredits, useAnalysis } from '../../lib/analysisCredits';
import { extractPlantInfo } from '../../utils/plantDetails';
import { fetchPlantImage, trackAnalysis, checkCredits, parseSavedGeminiInfo, getPlantDetails } from '../../utils/analysisUtils';

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
  const [analysisPhase, setAnalysisPhase] = useState('none'); // 'none', 'initial', 'plantnet', 'gemini', 'complete'
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

  // Helper function to handle saved plant view
  const handleSavedView = () => {
    // For saved plants, we don't need to show loading phases
    setAnalysisPhase('complete');
    
    if (searchParams?.savedGeminiInfo) {
      const parsedGeminiInfo = parseSavedGeminiInfo(searchParams.savedGeminiInfo);
      if (parsedGeminiInfo) {
        setGeminiInfo(parsedGeminiInfo);
      } else {
        setGeminiError('Error loading saved plant information.');
      }
    } else {
      setGeminiError('No saved plant information available.');
    }
    setGeminiLoading(false);
  };

  // Helper function to handle text-based search
  const handleTextSearch = async () => {
    try {
      setGeminiPlantName(plantName);
      
      // Skip PlantNet and directly use Gemini API
      const info = await getPlantDetails(plantName);
      setGeminiInfo(info);
      
      // Fetch a random plant image from Unsplash
      const imageUrl = fetchPlantImage(plantName);
      setPlantImageUrl(imageUrl);
      
      // Track analysis if user is logged in
      if (user?.id) {
        const newCredits = await trackAnalysis(user.id);
        if (newCredits) setCredits(newCredits);
      }
      
      return true;
    } catch (error) {
      console.error('Error in text-based plant search:', error);
      
      // Check if this is a model overload error
      const errorMessage = error.message || '';
      if (errorMessage.includes('model is overloaded') || errorMessage.includes('503')) {
        setGeminiError('The AI service is currently busy. Please try again in a few moments.');
      } else {
        setGeminiError(errorMessage || 'Failed to get plant information');
      }
      
      return false;
    }
  };

  // Helper function to handle image-based search
  const handleImageSearch = async () => {
    const plantName = getPlantNetTopName();
    setGeminiPlantName(plantName);

    if (!plantName) {
      setGeminiError('Could not determine a valid plant name from PlantNet. Please try another image.');
      return false;
    }

    // Check credits before proceeding
    if (user?.id && !(await checkCredits(user.id))) {
      setGeminiLoading(false);
      return false;
    }

    try {
      // Get plant info from Gemini
      const info = await getPlantDetails(plantName);
      if (!info || Object.keys(info).length === 0) {
        setGeminiError('No detailed plant information could be found for this analysis.');
        setGeminiInfo(null);
        return false;
      }
      
      setGeminiInfo(info);
      return true;
    } catch (err) {
      setGeminiError(err.message || 'Failed to fetch plant information');
      setGeminiInfo(null);
      return false;
    }
  };

  // Handle plant analysis on mount/plant change
  useEffect(() => {
    const handlePlantAnalysis = async () => {
      // Handle saved view
      if (searchParams?.isSavedView) {
        handleSavedView();
        return;
      }

      // Start a new analysis - clear previous data
      setAnalysisPhase('initial');
      setGeminiInfo(null); // Clear previous plant info
      setGeminiError(null);
      
      // Handle text-based search differently
      if (isTextSearch && plantName) {
        // For text search, we go straight to Gemini
        setAnalysisPhase('gemini');
        setGeminiLoading(true);
        const success = await handleTextSearch();
        setGeminiLoading(!success);
        setAnalysisPhase(success ? 'complete' : 'none');
      } else {
        // For image search, we show PlantNet results first, then Gemini
        setAnalysisPhase('plantnet');
        // PlantNet data is already available in plantData
        
        // Now proceed to Gemini
        setAnalysisPhase('gemini');
        setGeminiLoading(true);
        const success = await handleImageSearch();
        setGeminiLoading(!success);
        setAnalysisPhase(success ? 'complete' : 'none');
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
      // Start a new analysis with phases
      setAnalysisPhase('initial');
      setGeminiInfo(null);
      setGeminiError(null);
      
      // Go straight to Gemini phase for text search
      setAnalysisPhase('gemini');
      setGeminiLoading(true);
      const success = await handleTextSearch();
      setGeminiLoading(!success);
      setAnalysisPhase(success ? 'complete' : 'none');
    }
  };

  return (
    <AnalysisContent
      imageUri={isTextSearch ? plantImageUrl : imageUri}
      plantData={plantData}
      plantInfo={plantInfo}
      analysisPhase={analysisPhase}
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
