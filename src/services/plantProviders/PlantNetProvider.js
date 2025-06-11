import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import BaseProvider from './BaseProvider';

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';

export default class PlantNetProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = PLANTNET_API_URL;
  }

  async identifyPlant(imageUri) {
    try {
      // Read the file as base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create form data
      const formData = new FormData();
      
      // For web, we need to convert base64 to blob
      if (Platform.OS === 'web') {
        const blob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(res => res.blob());
        formData.append('images', blob, 'plant.jpg');
      } else {
        // For mobile, we can use the file directly
        formData.append('images', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'plant.jpg',
        });
      }
      
      formData.append('organs', 'auto');

      // Make the API request
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PlantNet API error:', errorText);
        throw new Error(`PlantNet API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the response to match our app's expected format
      return this.formatPlantNetResponse(data);
      
    } catch (error) {
      console.error('Error in PlantNet identifyPlant:', error);
      throw error;
    }
  }

  formatPlantNetResponse(data) {
    if (!data.results || data.results.length === 0) {
      throw new Error('No plants identified in the image');
    }

    // Get the top 3 results
    const topResults = data.results.slice(0, 3);

    return {
      is_plant: { is_plant: true }, // PlantNet doesn't provide this, assume true
      suggestions: topResults.map((result, index) => ({
        id: `plantnet-${Date.now()}-${index}`,
        plant_name: result.species.scientificNameWithoutAuthor,
        probability: result.score,
        plant_details: {
          common_names: result.species.commonNames || [],
          scientific_name: result.species.scientificNameWithoutAuthor,
          taxonomy: {
            family: result.species.family?.scientificNameWithoutAuthor,
            genus: result.species.genus?.scientificNameWithoutAuthor,
          },
          // Add more details as needed
        },
      })),
    };
  }
}
