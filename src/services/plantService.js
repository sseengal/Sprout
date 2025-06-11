import * as FileSystem from 'expo-file-system';
import { PLANTNET_API_KEY } from '@env';
import PlantNetProvider from './plantProviders/PlantNetProvider';
import HousePlantProvider from './plantProviders/HousePlantProvider';

// Log the API key for debugging (remove in production)
if (__DEV__) {
  console.log('Using PlantNet API Key:', PLANTNET_API_KEY ? 'Key loaded successfully' : 'Key not found');
}

// Initialize providers
const plantNetProvider = new PlantNetProvider(PLANTNET_API_KEY);
const housePlantProvider = new HousePlantProvider(process.env.HOUSE_PLANTS_API_KEY);

/**
 * Identifies a plant from an image and fetches care tips
 * @param {string} imageUri - URI of the image to identify
 * @returns {Promise<Object>} - The identified plant data with care tips
 */
export const identifyPlant = async (imageUri) => {
  try {
    console.log('Analyzing plant with PlantNet...');
    const plantNetData = await plantNetProvider.identifyPlant(imageUri);
    console.log('Plant identification results:', plantNetData);
    
    if (!plantNetData.suggestions || plantNetData.suggestions.length === 0) {
      throw new Error('No matching plants found. Please try with a clearer image.');
    }

    // Get the top suggestion
    const topSuggestion = plantNetData.suggestions[0];
    console.log('Top suggestion:', topSuggestion.plant_name);
    
    // Skip House Plants API for now as it's causing 404 errors
    // We'll rely on PlantNet data and fallback care tips
    console.log('Skipping House Plants API due to known issues');
    const housePlantData = null;
    
    // Prepare the result
    const result = {
      ...plantNetData,
      careTips: [],
      housePlantData: housePlantData,
      _debug: {
        plantName: topSuggestion.plant_name,
        hasHousePlantData: !!housePlantData
      }
    };
    
    // Function to get default care tips for common plants
    const getDefaultCareTips = (plantName) => {
      const defaultTips = [
        'Water when the top inch of soil feels dry to the touch.',
        'Provide bright, indirect sunlight for optimal growth.',
        'Use well-draining soil to prevent root rot.',
        'Rotate the plant occasionally for even growth.'
      ];
      
      const lowerName = plantName.toLowerCase();
      
      // Add plant-specific tips based on common plant types
      if (lowerName.includes('philodendron')) {
        defaultTips.push(
          'Philodendrons prefer medium to bright indirect light.',
          'Allow the top 1-2 inches of soil to dry between waterings.',
          'Wipe leaves with a damp cloth to keep them dust-free.'
        );
      } else if (lowerName.includes('monstera') || lowerName.includes('swiss cheese')) {
        defaultTips.push(
          'Monsteras enjoy bright, indirect light but can tolerate medium light.',
          'Water when the top 1-2 inches of soil are dry.',
          'Wipe leaves occasionally to keep them clean and allow for better light absorption.'
        );
      } else if (lowerName.includes('pothos') || lowerName.includes('epipremnum')) {
        defaultTips.push(
          'Pothos are very forgiving and can tolerate low light, but thrive in medium to bright indirect light.',
          'Allow the soil to dry out between waterings.',
          'Can be grown in water or soil.'
        );
      } else if (lowerName.includes('snake plant') || lowerName.includes('sansevieria')) {
        defaultTips.push(
          'Snake plants are drought-tolerant and prefer to dry out between waterings.',
          'Can tolerate low light but prefer bright, indirect light.',
          'Be careful not to overwater as they are prone to root rot.'
        );
      } else if (lowerName.includes('zz plant') || lowerName.includes('zamioculcas')) {
        defaultTips.push(
          'ZZ plants are drought-tolerant and prefer to dry out between waterings.',
          'Can thrive in low light conditions.',
          'Water sparingly, especially in winter months.'
        );
      }
      
      return defaultTips;
    };
    
    // Initialize care tips with default ones based on plant name
    result.careTips = getDefaultCareTips(topSuggestion.plant_name);
    
    // Add PlantNet wiki description if available
    if (topSuggestion.plant_details?.wiki_description?.value) {
      result.careTips.push(topSuggestion.plant_details.wiki_description.value);
    }
    
    console.log('Final identification result:', {
      plantName: result.suggestions?.[0]?.plant_name,
      hasTrefleData: !!result.trefleData,
      careTipsCount: result.careTips?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('Error in identifyPlant:', error);
    throw new Error(error.message || 'Failed to identify plant. Please try again.');
  }
};

/**
 * Gets detailed information about a specific plant
 * @param {string} plantId - The plant ID from the identification
 * @returns {Promise<Object>} - Detailed plant information
 */
export const getPlantDetails = async (plantId) => {
  try {
    const response = await fetch(`https://api.plant.id/v2/plant/${plantId}`, {
      method: 'GET',
      headers: {
        'Api-Key': PLANT_ID_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting plant details:', error);
    throw new Error('Failed to get plant details. Please try again.');
  }
};

/**
 * Gets care tips for a specific plant
 * @param {string} plantName - The name of the plant
 * @returns {Promise<Object>} - Care tips for the plant
 */
export const getCareTips = async (plantName) => {
  // In a real app, you would fetch this from your backend or a plant care API
  // For now, we'll return some generic care tips
  return {
    watering: 'Water when the top inch of soil feels dry to the touch.',
    sunlight: 'Prefers bright, indirect light. Can tolerate some direct sun.',
    temperature: 'Thrives in temperatures between 65-80°F (18-27°C).',
    humidity: 'Prefers moderate to high humidity.',
    fertilizer: 'Feed monthly during growing season with a balanced fertilizer.',
  };
};

/**
 * Saves a plant to the user's collection
 * @param {Object} plantData - The plant data to save
 * @returns {Promise<boolean>} - Whether the save was successful
 */
export const savePlant = async (plantData) => {
  // In a real app, you would save this to a database
  // For now, we'll just log it and return true
  console.log('Saving plant:', plantData);
  return true;
};

/**
 * Gets the user's saved plants
 * @returns {Promise<Array>} - The user's saved plants
 */
export const getSavedPlants = async () => {
  // In a real app, you would fetch this from a database
  // For now, we'll return an empty array
  return [];
};
