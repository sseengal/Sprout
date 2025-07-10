import 'react-native-url-polyfill/auto';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

/**
 * Service to interact with our secure API endpoints
 */

// Plant.ID API functionality has been completely disabled
export const analyzePlantHealth = async (imageUri) => {
  // Return empty data instead of making API call
  console.log('Plant.ID disease detection has been disabled');
  return {
    // Return empty mock data structure
    health_assessment: {
      is_healthy: true,
      diseases: []
    }
  };
};

export const identifyPlant = async (imageUri) => {
  try {
    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.functions.invoke('plantnet-identify', {
      body: { imageBase64: base64Image },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error identifying plant:', error);
    throw error;
  }
};

export const generateWithGemini = async (prompt) => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-generate', {
      body: { prompt },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating with Gemini:', error);
    throw error;
  }
};
