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
  
  // Add debug logging
  console.log('DEBUG: Analysis received search params:', {
    hasPlantData: !!searchParams?.plantData,
    hasPlantName: !!searchParams?.plantName,
    hasImageUri: !!searchParams?.imageUri,
    isTextSearchParam: searchParams?.isTextSearch,
    savedGeminiInfo: !!searchParams?.savedGeminiInfo
  });
  
  // First check for explicit text search flag in URL params
  if (searchParams && searchParams.isTextSearch === 'true') {
    console.log('DEBUG: Text search detected from URL param');
    isTextSearch = true;
    plantName = searchParams.plantName;
    // For text search, we'll use the savedGeminiInfo directly
    if (searchParams.savedGeminiInfo) {
      try {
        const geminiData = JSON.parse(searchParams.savedGeminiInfo);
        // We'll set this later in handleSavedView
      } catch (error) {
        console.error('Error parsing savedGeminiInfo:', error);
      }
    }
  }
  
  // Then process plantData
  if (searchParams && searchParams.plantData) {
    try {
      // Only parse if plantData is a string that looks like JSON
      if (typeof searchParams.plantData === 'string' && searchParams.plantData.trim().startsWith('{')) {
        const parsed = JSON.parse(searchParams.plantData);
        console.log('DEBUG: Parsed plant data:', {
          hasTextSearch: !!parsed.textSearch,
          searchType: parsed.searchType,
          hasGeminiData: !!parsed.geminiData
        });
        
        // Check if this is a text-based search
        if (parsed && (parsed.textSearch || parsed.searchType === 'text')) {
          console.log('DEBUG: Text search detected from plantData');
          isTextSearch = true;
          plantName = searchParams.plantName || parsed.searchTerm;
          plantData = parsed;
          imageUri = searchParams.imageUri || parsed.imageUri;
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
    } catch (error) {
      console.error('Error parsing plantData:', error);
      plantData = searchParams.plantData;
      imageUri = searchParams.imageUri;
    }
  }
  
  // Final debug log of determined search type
  console.log('DEBUG: Analysis determined:', {
    isTextSearch,
    plantName,
    hasPlantData: !!plantData,
    hasImageUri: !!imageUri
  });

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
      console.log('DEBUG: Handling text search for:', plantName);
      setGeminiPlantName(plantName);
      
      // If we already have Gemini info from the search params, use that
      if (searchParams?.savedGeminiInfo) {
        try {
          console.log('DEBUG: Using saved Gemini info from params');
          const info = JSON.parse(searchParams.savedGeminiInfo);
          setGeminiInfo(info);
        } catch (error) {
          console.error('Error parsing saved Gemini info:', error);
          // Fall back to fetching new info
          console.log('DEBUG: Falling back to fetching new Gemini info');
          const info = await getPlantDetails(plantName);
          setGeminiInfo(info);
        }
      } else {
        // Skip PlantNet and directly use Gemini API
        console.log('DEBUG: Fetching new Gemini info');
        const info = await getPlantDetails(plantName);
        setGeminiInfo(info);
      }
      
      // Use image URI from params or fetch a new one
      if (imageUri) {
        console.log('DEBUG: Using image URI from params:', imageUri);
        setPlantImageUrl(imageUri);
      } else {
        // Fetch a random plant image from Unsplash
        console.log('DEBUG: Fetching new plant image');
        const imageUrl = await fetchPlantImage(plantName);
        setPlantImageUrl(imageUrl);
      }
      
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
    // Skip this entire function for text-based searches
    if (isTextSearch) {
      console.log('DEBUG: Skipping image search for text-based search');
      return true;
    }
    
    const plantName = getPlantNetTopName();
    console.log('DEBUG: Image search using PlantNet name:', plantName);
    setGeminiPlantName(plantName);

    if (!plantName) {
      console.error('DEBUG: No valid plant name from PlantNet');
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
      console.log('DEBUG: Starting plant analysis, isTextSearch:', isTextSearch);
      
      // Handle saved view
      if (searchParams?.isSavedView) {
        console.log('DEBUG: Handling saved view');
        handleSavedView();
        return;
      }

      // Start a new analysis - clear previous data
      setAnalysisPhase('initial');
      setGeminiInfo(null); // Clear previous plant info
      setGeminiError(null);
      // Clear any previous plant image URL for text searches
      if (isTextSearch) {
        setPlantImageUrl('');  
      }
      
      // Handle text-based search differently
      if (isTextSearch && plantName) {
        console.log('DEBUG: Processing text-based search for:', plantName);
        // For text search, we go straight to Gemini
        setAnalysisPhase('gemini');
        setGeminiLoading(true);
        const success = await handleTextSearch();
        console.log('DEBUG: Text search result:', success ? 'success' : 'failed');
        setGeminiLoading(!success);
        setAnalysisPhase(success ? 'complete' : 'none');
      } else {
        console.log('DEBUG: Processing image-based search');
        // For image search, we show PlantNet results first, then Gemini
        setAnalysisPhase('plantnet');
        // PlantNet data is already available in plantData
        
        // Now proceed to Gemini
        setAnalysisPhase('gemini');
        setGeminiLoading(true);
        const success = await handleImageSearch();
        console.log('DEBUG: Image search result:', success ? 'success' : 'failed');
        setGeminiLoading(!success);
        setAnalysisPhase(success ? 'complete' : 'none');
      }
    };

    handlePlantAnalysis();
  }, [searchParams?.plantData, searchParams?.imageUri, searchParams?.plantName, searchParams?.isTextSearch, searchParams?.isSavedView]);

  // Disease detection functionality has been disabled
  // useEffect for fetchPlantHealthData removed

  // Only show plant info if we have Gemini data
  // Extract plant info and ensure common name is set for text-based searches
  const plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
  
  // For text-based searches, ensure the common name is set to the search term if not already set
  let displayPlantInfo = plantInfo;
  if (plantInfo && isTextSearch && plantName && !plantInfo.commonName) {
    displayPlantInfo = {
      ...plantInfo,
      commonName: plantName
    };
  }
  
  // Generate a unique ID for the plant
  const plantId = isTextSearch ? 
    `text-${plantName}-${Date.now()}` : 
    ((plantData && plantData.id) || (imageUri ? imageUri : '') + (plantInfo?.scientificName || ''));
  
  // Check if we have a saved state
  const { isPlantSaved, addPlant, removePlant } = useSavedPlants();
  const [saved, setSaved] = useState(false);
  
  // Check if the plant is saved when data changes
  useEffect(() => {
    if (isTextSearch && geminiInfo) {
      // For text search, we check by plant name
      const isSaved = isPlantSaved({ 
        plantData: { 
          commonName: plantInfo?.commonName || plantName,
          scientificName: plantInfo?.scientificName || ''
        } 
      });
      setSaved(isSaved);
    } else if (plantData?.suggestions && plantData.suggestions.length > 0) {
      // For image search, we check by scientific name
      const suggestion = plantData.suggestions[0];
      const scientificName = suggestion.plant_details?.scientific_name || '';
      const isSaved = isPlantSaved({ plantData: { scientificName } });
      setSaved(isSaved);
    }
  }, [plantData, geminiInfo, isPlantSaved, plantInfo, plantName, isTextSearch]);

  const handleToggleSave = () => {
    if (!plantInfo && !isTextSearch) return;
    
    if (saved) {
      removePlant(plantId);
      setSaved(false);
      Toast.show({
        type: 'info',
        text1: 'Plant removed',
        text2: (displayPlantInfo?.commonName || plantName || 'Plant') + ' has been removed from your collection',
        position: 'top',
        visibilityTime: 2000,
      });
    } else {
      // Handle saving differently based on search type
      if (isTextSearch) {
        // For text-based searches, use the standardized plant data model
        const { createStandardPlantData } = require('../../utils/plantDataModel');
        
        const standardPlantData = createStandardPlantData({
          geminiData: {
            ...geminiInfo,
            plantInfo: plantInfo
          },
          imageUri: plantImageUrl,
          searchType: 'text',
          searchTerm: plantName,
          id: plantId
        });
        
        addPlant(standardPlantData);
      } else {
        // Import the standardized plant data model
        const { createStandardPlantData } = require('../../utils/plantDataModel');
        
        if (isTextSearch) {
          // For text-based searches, use the standardized plant data model
          const standardPlantData = createStandardPlantData({
            geminiData: {
              ...geminiInfo,
              plantInfo: displayPlantInfo
            },
            imageUri: plantImageUrl,
            searchType: 'text',
            searchTerm: plantName,
            id: plantId
          });
          
          addPlant(standardPlantData);
        } else {
          // For image-based searches, use the standardized plant data model
          const standardPlantData = createStandardPlantData({
            plantNetData: plantData,
            geminiData: {
              ...geminiInfo,
              plantInfo: plantInfo
            },
            imageUri: imageUri || '',
            searchType: 'image',
            id: plantId
          });
          
          addPlant(standardPlantData);
        }
      }
      setSaved(true); // Update the saved state
      Toast.show({
        type: 'info',
        text1: 'Plant saved',
        text2: (displayPlantInfo?.commonName || plantName || 'Plant') + ' has been added to your collection',
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
      plantInfo={displayPlantInfo}
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
