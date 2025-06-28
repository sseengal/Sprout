import 'react-native-url-polyfill/auto';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Service to interact with our secure API endpoints
 */

export const analyzePlantHealth = async (imageUri) => {
  try {
    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.functions.invoke('plant-id-analyze', {
      body: { imageBase64: base64Image },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error analyzing plant health:', error);
    throw error;
  }
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
