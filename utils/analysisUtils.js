import { Alert } from 'react-native';
import { getPlantInfo } from './geminiService';
import { getAvailableCredits, useAnalysis } from '../lib/analysisCredits';

/**
 * Fetch a plant image from Unsplash based on plant name
 * @param {string} name - Plant name to search for
 * @returns {string} - Image URL
 */
export const fetchPlantImage = (name) => {
  try {
    // Create a safe search term by removing any special characters
    const searchTerm = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    // Use Unsplash source for a random plant image
    return `https://source.unsplash.com/featured/?${searchTerm},plant`;
  } catch (imageError) {
    console.error('Error creating plant image URL:', imageError);
    // Use a default plant image if fetching fails
    return 'https://source.unsplash.com/featured/?plant';
  }
};

/**
 * Track plant analysis and update user credits
 * @param {string} userId - User ID
 * @returns {Promise<Object|boolean>} - Credits object or false on error
 */
export const trackAnalysis = async (userId) => {
  if (!userId) return false;
  
  try {
    await useAnalysis(userId);
    return await getAvailableCredits(userId);
  } catch (error) {
    console.error('Error recording analysis:', error);
    return false;
  }
};

/**
 * Check if user has enough credits for analysis
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user has credits, false otherwise
 */
export const checkCredits = async (userId) => {
  if (!userId) return true;
  
  try {
    // Check if user has enough credits
    const creditCheck = await useAnalysis(userId);
    if (creditCheck.total <= 0) {
      Alert.alert(
        'Limit Reached', 
        'You\'ve used all your available analyses. Please upgrade your plan for more.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Record the analysis
    const result = await useAnalysis(userId);
    if (!result.success) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking credits:', error);
    if (error?.error === 'ANALYSIS_LIMIT_REACHED') {
      Alert.alert(
        'Limit Reached', 
        `You've used all your monthly analyses. ${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }
};

/**
 * Parse saved Gemini info from navigation params
 * @param {string} savedGeminiInfoString - Stringified Gemini info
 * @returns {Object|null} - Parsed Gemini info or null on error
 */
export const parseSavedGeminiInfo = (savedGeminiInfoString) => {
  if (!savedGeminiInfoString) return null;
  
  try {
    return JSON.parse(savedGeminiInfoString);
  } catch (error) {
    console.error('Error parsing saved Gemini info:', error);
    return null;
  }
};

/**
 * Get plant information from Gemini API
 * @param {string} plantName - Plant name to search for
 * @returns {Promise<Object|null>} - Plant info object or null on error
 */
export const getPlantDetails = async (plantName) => {
  if (!plantName) return null;
  
  try {
    return await getPlantInfo(plantName);
  } catch (error) {
    console.error('Error getting plant details:', error);
    throw error;
  }
};
