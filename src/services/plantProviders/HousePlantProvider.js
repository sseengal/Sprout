import BaseProvider from './BaseProvider';

const HOUSE_PLANTS_API_URL = 'https://house-plants2.p.rapidapi.com';

export default class HousePlantProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = HOUSE_PLANTS_API_URL;
    this.providerName = 'HousePlantsAPI';
  }

  /**
   * Search for plants by name
   * @param {string} query - Plant name to search for
   * @returns {Promise<Array>} - Array of matching plants
   */
  async searchPlants(query) {
    if (!query) {
      console.log('No query provided for plant search');
      return [];
    }

    try {
      const cleanQuery = query.trim().toLowerCase();
      console.log('Searching House Plants API for:', cleanQuery);
      
      const url = `${this.baseUrl}/search/${encodeURIComponent(cleanQuery)}`;
      console.log('House Plants API search URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'house-plants2.p.rapidapi.com'
        }
      });
      
      if (!response.ok) {
        throw new Error(`House Plants API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.log('Unexpected response format from House Plants API');
        return [];
      }
      
      console.log(`Found ${data.length} results from House Plants API`);
      return data;
      
    } catch (error) {
      console.error('Error in House Plants API searchPlants:', error);
      throw new Error('Failed to search for plants. Please try again later.');
    }
  }

  /**
   * Get detailed information about a specific plant
   * @param {string} plantId - The plant ID
   * @returns {Promise<Object>} - Detailed plant information
   */
  async getPlantDetails(plantId) {
    if (!plantId) {
      console.log('No plant ID provided');
      return null;
    }

    try {
      console.log('Fetching plant details from House Plants API for ID:', plantId);
      
      const url = `${this.baseUrl}/id/${plantId}`;
      console.log('House Plants API details URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'house-plants2.p.rapidapi.com'
        }
      });
      
      if (!response.ok) {
        throw new Error(`House Plants API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        console.log('No plant details found in House Plants API response');
        return null;
      }
      
      console.log('Successfully retrieved plant details from House Plants API');
      return data;
      
    } catch (error) {
      console.error('Error in House Plants API getPlantDetails:', error);
      throw new Error('Failed to fetch plant details. Please try again later.');
    }
  }

  /**
   * Format plant data for consistent use in the app
   * @param {Object} plantData - Raw plant data from House Plants API
   * @returns {Object} - Formatted plant data
   */
  formatPlantData(plantData) {
    if (!plantData) {
      console.log('No plant data to format');
      return null;
    }

    console.log('Formatting House Plants API data for:', plantData.Latin);
    
    // Extract care information
    const careInfo = plantData.temp || {};
    const waterInfo = plantData.watering || {};
    
    const formattedData = {
      id: plantData._id || '',
      name: plantData['Common name'] || '',
      scientificName: plantData.Latin || '',
      family: plantData.Family || '',
      category: plantData.Categories || '',
      origin: plantData.Origin || '',
      climate: plantData.Climate || '',
      
      // Care information
      careTips: [],
      
      // Light requirements
      light: {
        ideal: careInfo.light_ideal || '',
        tolerated: careInfo.light_tolerated || ''
      },
      
      // Watering requirements
      watering: {
        summer: waterInfo.watering_summer || '',
        winter: waterInfo.watering_winter || ''
      },
      
      // Temperature preferences
      temperature: {
        min: careInfo.temperature_min || '',
        max: careInfo.temperature_max || ''
      },
      
      // Additional metadata
      toxicity: plantData.toxicity || '',
      growthRate: plantData.growth_rate || '',
      
      // Images
      images: plantData.images ? Object.values(plantData.images) : [],
      
      // Raw data for debugging
      _raw: plantData
    };
    
    // Generate care tips from available data
    if (careInfo.light_ideal) {
      formattedData.careTips.push(`Light: ${careInfo.light_ideal}`);
    }
    
    if (waterInfo.watering_summer) {
      formattedData.careTips.push(`Watering (Summer): ${waterInfo.watering_summer}`);
    }
    
    if (waterInfo.watering_winter) {
      formattedData.careTips.push(`Watering (Winter): ${waterInfo.watering_winter}`);
    }
    
    if (careInfo.temperature_min && careInfo.temperature_max) {
      formattedData.careTips.push(`Ideal Temperature: ${careInfo.temperature_min}°C - ${careInfo.temperature_max}°C`);
    }
    
    if (plantData.humidity) {
      formattedData.careTips.push(`Humidity: ${plantData.humidity}`);
    }
    
    if (plantData.soil) {
      formattedData.careTips.push(`Soil: ${plantData.soil}`);
    }
    
    // If no specific care tips, add a generic message
    if (formattedData.careTips.length === 0) {
      formattedData.careTips.push('No specific care information available for this plant.');
    }
    
    console.log('Formatted plant data:', formattedData);
    return formattedData;
  }
}
