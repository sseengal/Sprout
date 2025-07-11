import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import { getAvailableCredits } from '../lib/analysisCredits';
import {
    checkCredits,
    fetchPlantImage,
    getPlantDetails,
    parseSavedGeminiInfo,
    trackAnalysis
} from '../utils/analysisUtils';
import { extractPlantInfo } from '../utils/plantDetails';
import { createStandardPlantData } from '../utils/plantDataModel';

/**
 * Custom hook to manage Analysis screen state and logic
 * @param {Object} searchParams - Navigation search parameters
 * @returns {Object} - Analysis state and methods
 */
export const useAnalysisState = (searchParams) => {
  const { user } = useAuth();
  const { addPlant, removePlant, isPlantSaved } = useSavedPlants();
  
  // Plant data states
  const [plantData, setPlantData] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [plantName, setPlantName] = useState('');
  const [isTextSearch, setIsTextSearch] = useState(false);
  const [plantImageUrl, setPlantImageUrl] = useState(null);
  
  // Gemini API states
  const [geminiInfo, setGeminiInfo] = useState(null);
  const [geminiPlantName, setGeminiPlantName] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(null);
  
  // Credits and saved state
  const [credits, setCredits] = useState({ total: 0, used: 0 });
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Initialize state from navigation params
  useEffect(() => {
    // Parse plantData if it exists
    if (searchParams?.plantData) {
      try {
        const parsedData = JSON.parse(searchParams.plantData);
        setPlantData(parsedData);
      } catch (error) {
        console.error('Error parsing plant data:', error);
      }
    }
    
    // Set image URI if it exists
    if (searchParams?.imageUri) {
      setImageUri(searchParams.imageUri);
    }
    
    // Set plant name for text search
    if (searchParams?.plantName) {
      setPlantName(searchParams.plantName);
      setIsTextSearch(true);
    }
  }, [searchParams]);
  
  // Check if plant is saved on mount and when plantData changes
  useEffect(() => {
    // Check if the plant is already saved
    if (plantData && plantData.id) {
      const isSaved = isPlantSaved({ id: plantData.id });
      setSaved(isSaved);
    } else if (geminiInfo && imageUri) {
      const plantInfo = extractPlantInfo(geminiInfo);
      const isSaved = isPlantSaved({
        imageUri,
        scientificName: plantInfo.scientificName
      });
      setSaved(isSaved);
    }
  }, [plantData, geminiInfo, imageUri, isPlantSaved]);
  
  // Reset Gemini info when component unmounts or when not in saved view
  useEffect(() => {
    if (!searchParams?.isSavedView) {
      setGeminiInfo(null);
      return () => {
        setGeminiInfo(null);
      };
    }
  }, []);
  
  // Helper function to get the top plant name from PlantNet data
  const getPlantNetTopName = () => {
    if (!plantData || !plantData.suggestions || plantData.suggestions.length === 0) {
      return null;
    }
    
    const topSuggestion = plantData.suggestions[0];
    return topSuggestion.plant_name || '';
  };
  
  // Helper function to handle saved plant view
  const handleSavedView = () => {
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
  
  // Handle plant analysis
  const handlePlantAnalysis = async () => {
    // Handle saved view
    if (searchParams?.isSavedView) {
      handleSavedView();
      return;
    }
    
    // New analysis - proceed with API calls
    setGeminiLoading(true);
    setGeminiError(null);
    
    let success = false;
    
    // Handle text-based search differently
    if (isTextSearch && plantName) {
      success = await handleTextSearch();
    } else {
      success = await handleImageSearch();
    }
    
    setGeminiLoading(!success);
  };
  
  // Function to toggle save status
  const handleToggleSave = async () => {
    try {
      // Extract plant info from Gemini data for UI messages
      let plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
      
      // For text-based searches, ensure the common name is set to the search term if not already set
      if (plantInfo && isTextSearch && plantName && !plantInfo.commonName) {
        plantInfo = {
          ...plantInfo,
          commonName: plantName
        };
      }
      
      if (saved) {
        // Get plant ID for removal
        const plantId = plantData?.id || '';
        if (!plantId) {
          console.error('Cannot remove plant: missing plant ID');
          return;
        }
        
        await removePlant(plantId);
        setSaved(false);
        Toast.show({
          type: 'info',
          text1: 'Plant removed',
          text2: plantInfo?.commonName || 'Plant has been removed from your collection',
          position: 'top',
          visibilityTime: 2000
        });
      } else {
        // Create standardized plant data
        const standardPlantData = createStandardPlantData({
          plantNetData: plantData,
          geminiData: geminiInfo,
          imageUri: isTextSearch ? plantImageUrl : imageUri || '',
          searchType: isTextSearch ? 'text' : 'image',
          searchTerm: isTextSearch ? plantName : ''
        });
        
        // Save the plant using the standardized format
        await addPlant(standardPlantData);
        setSaved(true);
        Toast.show({
          type: 'info',
          text1: 'Plant saved',
          text2: standardPlantData.commonName || 'Plant has been added to your collection',
          position: 'top',
          visibilityTime: 2000
        });
      }
    } catch (error) {
      console.error('Error toggling plant save status:', error);
      Toast.show({
        type: 'error',
        text1: saved ? 'Error removing plant' : 'Error saving plant',
        text2: error.message || 'Please try again',
        position: 'top',
        visibilityTime: 3000
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
  
  // Function to retry text-based search
  const handleRetryTextSearch = async () => {
    if (isTextSearch && plantName) {
      await handlePlantAnalysis();
    }
  };
  
  // Run plant analysis when params change
  useEffect(() => {
    handlePlantAnalysis();
  }, [searchParams?.plantData, searchParams?.imageUri, searchParams?.plantName, searchParams?.isSavedView]);
  
  // Extract plant info from Gemini data
  let plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
  
  // For text-based searches, ensure the common name is set to the search term if not already set
  if (plantInfo && isTextSearch && plantName && !plantInfo.commonName) {
    plantInfo = {
      ...plantInfo,
      commonName: plantName
    };
  }
  
  return {
    // State
    plantData,
    imageUri: isTextSearch ? plantImageUrl : imageUri,
    plantInfo,
    geminiLoading,
    geminiError,
    isTextSearch,
    credits,
    isLoadingCredits,
    saved,
    
    // Methods
    handleToggleSave,
    handleRetryTextSearch
  };
};
