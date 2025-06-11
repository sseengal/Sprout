import BaseProvider from './BaseProvider';

export default class OpenFarmProvider extends BaseProvider {
  constructor() {
    super();
    this.baseUrl = 'https://openfarm.cc/api/v1';
    this.providerName = 'OpenFarm';
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
      console.log('Searching OpenFarm for:', cleanQuery);
      
      const searchUrl = `${this.baseUrl}/crops?filter=${encodeURIComponent(cleanQuery)}`;
      console.log('OpenFarm search URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.warn('Received non-JSON response from OpenFarm:', text.substring(0, 200));
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`OpenFarm API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        console.log('No valid data returned from OpenFarm');
        return [];
      }
      
      console.log(`Found ${data.data.length} results from OpenFarm`);
      return data.data;
      
    } catch (error) {
      console.error('Error in OpenFarm searchPlants:', error);
      throw new Error('Failed to search for plants. Please try again later.');
    }
  }

  /**
   * Get detailed information about a specific plant
   * @param {string} cropId - OpenFarm crop ID
   * @returns {Promise<Object>} - Detailed plant information
   */
  async getPlantDetails(cropId) {
    if (!cropId) {
      console.log('No crop ID provided');
      return null;
    }

    try {
      console.log('Fetching plant details from OpenFarm for ID:', cropId);
      
      const detailsUrl = `${this.baseUrl}/crops/${cropId}`;
      console.log('OpenFarm details URL:', detailsUrl);
      
      const response = await fetch(detailsUrl);
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.warn('Received non-JSON response from OpenFarm details:', text.substring(0, 200));
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`OpenFarm API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data) {
        console.log('No plant details found in OpenFarm response');
        return null;
      }
      
      console.log('Successfully retrieved plant details from OpenFarm');
      return data.data;
      
    } catch (error) {
      console.error('Error in OpenFarm getPlantDetails:', error);
      throw new Error('Failed to fetch plant details. Please try again later.');
    }
  }

  /**
   * Format plant data for consistent use in the app
   * @param {Object} plantData - Raw plant data from OpenFarm
   * @returns {Object} - Formatted plant data
   */
  formatPlantData(plantData) {
    if (!plantData) {
      console.log('No plant data to format');
      return null;
    }

    console.log('Formatting OpenFarm data for:', plantData.attributes?.name);
    
    const attributes = plantData.attributes || {};
    const growingInfo = attributes.growing || {};
    
    const formattedData = {
      id: plantData.id,
      name: attributes.name || 'Unknown Plant',
      scientificName: attributes.scientific_names?.[0] || '',
      description: attributes.description || '',
      imageUrl: attributes.main_image_path || null,
      
      // Care information
      careTips: [],
      
      // Growing information
      growing: {
        description: growingInfo.description || '',
        sowingMethod: growingInfo.sowing_method || '',
        spread: growingInfo.spread || '',
        daysToHarvest: growingInfo.days_to_harvest || '',
        rowSpacing: growingInfo.row_spacing || '',
        height: growingInfo.height || ''
      },
      
      // Environmental requirements
      requirements: {
        sun: attributes.sun_requirements || '',
        growingDegreeDays: attributes.growing_degree_days || '',
        soil: growingInfo.soil || ''
      },
      
      // Additional metadata
      tags: attributes.tags || [],
      commonNames: attributes.common_names || [],
      
      // Raw data for debugging
      _raw: plantData
    };
    
    // Generate care tips from available data
    if (growingInfo.description) {
      formattedData.careTips.push(growingInfo.description);
    }
    
    if (growingInfo.sowing_method) {
      formattedData.careTips.push(`Sowing method: ${growingInfo.sowing_method}`);
    }
    
    if (attributes.sun_requirements) {
      formattedData.careTips.push(`Sun requirements: ${attributes.sun_requirements}`);
    }
    
    if (growingInfo.soil) {
      formattedData.careTips.push(`Soil: ${growingInfo.soil}`);
    }
    
    if (growingInfo.watering) {
      formattedData.careTips.push(`Watering: ${growingInfo.watering}`);
    }
    
    // If no specific care tips, add a generic message
    if (formattedData.careTips.length === 0) {
      formattedData.careTips.push('No specific care information available. General care recommendations may apply.');
    }
    
    console.log('Formatted plant data:', formattedData);
    return formattedData;
  }
}
