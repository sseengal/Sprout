// Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple storage wrapper
const storage = {
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  getItem: (key) => AsyncStorage.getItem(key),
  removeItem: (key) => AsyncStorage.removeItem(key),
  clear: () => AsyncStorage.clear()
};

const SAVED_PLANTS_KEY = '@saved_plants';

/**
 * Extracts the plant's common name from the plant data
 */
const getPlantName = (plantData) => {
  return (
    plantData?.suggestions?.[0]?.plant_details?.common_names?.[0] ||
    plantData?.housePlantData?.commonNames?.[0] ||
    'Unknown Plant'
  );
};

/**
 * Extracts the plant's scientific name from the plant data
 */
const getScientificName = (plantData) => {
  return (
    plantData?.housePlantData?.scientificName ||
    plantData?.suggestions?.[0]?.plant_details?.scientific_name ||
    null
  );
};

/**
 * Extracts plant details from the API response
 */
const extractPlantDetails = (plantData) => {
  const details = {};
  
  // Extract from PlantNet data
  if (plantData?.suggestions?.[0]?.plant_details) {
    const plantDetails = plantData.suggestions[0].plant_details;
    details.commonNames = plantDetails.common_names || [];
    details.scientificName = plantDetails.scientific_name;
    details.family = plantDetails.family;
    details.genus = plantDetails.genus;
  }
  
  // Extract from House Plant data if available
  if (plantData?.housePlantData) {
    const hpData = plantData.housePlantData;
    details.commonNames = details.commonNames || hpData.commonNames || [];
    details.scientificName = details.scientificName || hpData.scientificName;
    details.family = details.family || hpData.family;
    details.genus = details.genus || hpData.genus;
  }
  
  return details;
};

/**
 * Extracts care information from the plant data
 */
const extractCareInfo = (plantData) => {
  // If we have Gemini AI care info
  if (plantData?.plantInfo?.careGuide) {
    return plantData.plantInfo.careGuide;
  }
  
  // Fallback to basic care info if available
  if (plantData?.housePlantData?.care) {
    return {
      light: plantData.housePlantData.care.light,
      water: plantData.housePlantData.care.water,
      temperature: plantData.housePlantData.care.temperature,
      humidity: plantData.housePlantData.care.humidity,
    };
  }
  
  return {};
};

/**
 * Transforms the plant data into our storage format
 */
const transformPlantData = (plantData) => {
  return {
    id: Date.now().toString(),
    savedAt: Date.now(),
    plantName: getPlantName(plantData),
    scientificName: getScientificName(plantData),
    details: extractPlantDetails(plantData),
    careInfo: extractCareInfo(plantData),
    // Store the full plant data for future use
    originalData: plantData
  };
};

/**
 * Saves a plant to local storage
 * @param {Object} plantData - The plant data to save
 * @returns {Promise<Object>} The saved plant object
 */
export const savePlant = async (plantData) => {
  try {
    // Get existing plants
    const existingPlants = await storage.getItem(SAVED_PLANTS_KEY);
    const plants = existingPlants ? JSON.parse(existingPlants) : [];

    // Transform the plant data
    const plantToSave = transformPlantData(plantData);
    
    // Check for duplicates by name and scientific name
    const isDuplicate = plants.some(plant => 
      plant.plantName === plantToSave.plantName || 
      plant.scientificName === plantToSave.scientificName
    );

    if (isDuplicate) {
      throw new Error('This plant has already been saved');
    }

    // Add the new plant
    plants.push(plantToSave);

    // Save back to storage
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    
    return plantToSave;
  } catch (error) {
    console.error('Error saving plant:', error);
    throw error; // Re-throw to allow handling in the UI
  }
};

/**
 * Retrieves all saved plants
 * @returns {Promise<Array>} Array of saved plants
 */
export const getSavedPlants = async () => {
  try {
    const savedPlants = await storage.getItem(SAVED_PLANTS_KEY);
    return savedPlants ? JSON.parse(savedPlants) : [];
  } catch (error) {
    console.error('Error getting saved plants:', error);
    return [];
  }
};

/**
 * Deletes a saved plant by ID
 * @param {string} plantId - The ID of the plant to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deletePlant = async (plantId) => {
  try {
    const savedPlants = await storage.getItem(SAVED_PLANTS_KEY);
    let plants = savedPlants ? JSON.parse(savedPlants) : [];
    
    const initialLength = plants.length;
    plants = plants.filter(plant => plant.id !== plantId);
    
    if (plants.length === initialLength) {
      return false; // No plant was deleted
    }
    
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    return true;
  } catch (error) {
    console.error('Error deleting plant:', error);
    return false;
  }
};

// Export storage for testing
export { storage as AsyncStorage };
