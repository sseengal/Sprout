import BaseProvider from './BaseProvider';

const PERENUAL_API_URL = 'https://perenual.com/api';

export default class PerenualProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = PERENUAL_API_URL;
  }

  async searchPlants(query, page = 1) {
    try {
      if (!query) {
        console.log('No query provided for plant search');
        return [];
      }
      
      if (!this.apiKey) {
        console.warn('Perenual API key is not configured');
        throw new Error('Perenual API key is not configured. Please check your .env file.');
      }
      
      console.log(`Searching Perenual for: "${query}"`);
      const url = `https://perenual.com/api/species-list?key=${this.apiKey}&q=${encodeURIComponent(query)}&page=${page}`;
      console.log('API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perenual API error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        throw new Error(`Perenual API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Perenual search results:', {
        query,
        resultCount: data.data?.length || 0,
        firstResult: data.data?.[0]
      });
      
      return data.data || [];
    } catch (error) {
      console.error('Error searching plants:', {
        error: error.message,
        query,
        stack: error.stack
      });
      throw error;
    }
  }

  async getPlantDetails(plantId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/species/details/${plantId}?key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get plant details: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting plant details:', error);
      throw error;
    }
  }

  async getCareTips(plantId) {
    try {
      if (!this.apiKey) {
        console.warn('Perenual API key is not configured');
        throw new Error('Perenual API key is not configured. Please check your .env file.');
      }

      const response = await fetch(
        `https://perenual.com/api/species-care-guide-list?key=${this.apiKey}&species_id=${plantId}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perenual API error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        throw new Error(`Failed to get care tips: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting care tips:', error);
      throw error; // Re-throw to allow error handling in the UI
    }
  }
  
  async getPlantDetails(plantId) {
    try {
      if (!this.apiKey) {
        console.warn('Perenual API key is not configured');
        throw new Error('Perenual API key is not configured. Please check your .env file.');
      }

      const response = await fetch(
        `https://perenual.com/api/species/details/${plantId}?key=${this.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perenual API error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        throw new Error(`Failed to get plant details: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting plant details:', error);
      throw error; // Re-throw to allow error handling in the UI
    }
  }

  // Helper method to find the best matching plant from search results
  findBestMatch(results, plantName) {
    try {
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.log('No results to find best match');
        return null;
      }
      
      const lowerName = String(plantName || '').toLowerCase().trim();
      
      // Log the first result to debug structure
      if (results[0]) {
        console.log('First result structure:', {
          common_name: results[0].common_name,
          scientific_name: results[0].scientific_name,
          id: results[0].id
        });
      }
      
      // Find exact or partial match in common or scientific names
      const match = results.find(p => {
        const commonMatch = p.common_name && 
          String(p.common_name).toLowerCase().includes(lowerName);
        const scientificMatch = p.scientific_name && 
          String(p.scientific_name).toLowerCase().includes(lowerName);
        return commonMatch || scientificMatch;
      });
      
      return match || results[0]; // Return first result if no match found
      
    } catch (error) {
      console.error('Error in findBestMatch:', error);
      return results?.[0] || null; // Safely return first result or null
    }
  }
}
