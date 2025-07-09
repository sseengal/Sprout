/**
 * Plant.ID API Service
 * Handles communication with the Plant.ID API for plant identification and disease detection
 */

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// Access the API key from environment variables via Expo config
const API_KEY = Constants.expoConfig?.extra?.plantIdApiKey || process.env.EXPO_PUBLIC_PLANT_ID_API_KEY;
const BASE_URL = 'https://api.plant.id/v2';

/**
 * Identifies plant diseases from an image
 * @param {string} imageUri - Local URI of the plant image
 * @returns {Promise<Object>} - Plant disease identification results
 */
export const identifyDisease = async (imageUri) => {
  try {
    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Prepare request data
    const data = {
      api_key: API_KEY,
      images: [base64Image],
      modifiers: ["crops_fast", "similar_images"],
      disease_details: ["cause", "common_names", "classification", "description", "treatment", "url"],
      language: "en",
      disease: true,
    };

    // Make API request
    const response = await fetch(`${BASE_URL}/health_assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Plant.ID API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Plant.ID disease identification error:', error);
    throw error;
  }
};

/**
 * Gets health assessment details for a specific plant
 * @param {string} imageUri - Local URI of the plant image
 * @returns {Promise<Object>} - Detailed health assessment
 */
export const getHealthAssessment = async (imageUri) => {
  try {
    const result = await identifyDisease(imageUri);
    
    // Process and format the results
    const healthData = {
      isHealthy: result.health_assessment.is_healthy,
      diseases: result.health_assessment.diseases.map(disease => ({
        name: disease.name,
        probability: disease.probability,
        description: disease.description,
        treatment: {
          biological: disease.treatment.biological,
          chemical: disease.treatment.chemical,
          prevention: disease.treatment.prevention,
        },
        similarImages: disease.similar_images?.map(img => img.url) || [],
      })),
    };

    return healthData;
  } catch (error) {
    console.error('Error getting health assessment:', error);
    throw error;
  }
};

/**
 * Identifies a plant from an image
 * @param {string} imageUri - Local URI of the plant image
 * @returns {Promise<Object>} - Plant identification results
 */
export const identifyPlant = async (imageUri) => {
  try {
    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Prepare request data
    const data = {
      api_key: API_KEY,
      images: [base64Image],
      modifiers: ["crops_fast", "similar_images"],
      plant_details: ["common_names", "url", "wiki_description", "taxonomy", "synonyms"],
      language: "en",
    };

    // Make API request
    const response = await fetch(`${BASE_URL}/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Plant.ID API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Plant.ID identification error:', error);
    throw error;
  }
};

export default {
  identifyPlant,
  identifyDisease,
  getHealthAssessment,
};
