import axios from 'axios';
import { PLANT_NAMES, formatPlantInfo, displayPlantInfo } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

// Note: You'll need to sign up at https://perenual.com/ to get an API key
const PERENUAL_API_KEY = process.env.PERENUAL_API_KEY;
const API_URL = 'https://perenual.com/api';

async function searchPlant(query) {
  try {
    const response = await axios.get(`${API_URL}/species-list`, {
      params: {
        key: PERENUAL_API_KEY,
        q: query,
        page: 1,
        'watering[in]': 'average,minimum,maximum',
        'sunlight[in]': 'full_sun,part_shade,shade',
        'indoor': 1 // Only indoor plants
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching plant:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function getPlantDetails(plantId) {
  try {
    const response = await axios.get(`${API_URL}/species/details/${plantId}`, {
      params: {
        key: PERENUAL_API_KEY
      }
    });
    return response.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    return null;
  }
}

async function testPerenualAPI() {
  if (!PERENUAL_API_KEY) {
    console.error('❌ Perenual API key not found in .env file');
    console.log('ℹ️  Sign up at https://perenual.com/ to get an API key');
    return;
  }

  console.log('🌿 Testing Perenual API...');
  
  for (const plantName of PLANT_NAMES) {
    try {
      console.log(`\n🔍 Searching for: ${plantName}`);
      const plant = await searchPlant(plantName);
      
      if (!plant) {
        console.log(`No results found for ${plantName}`);
        continue;
      }
      
      const details = await getPlantDetails(plant.id);
      if (!details) {
        console.log(`No details found for ${plantName}`);
        continue;
      }
      
      const formattedPlant = formatPlantInfo({
        commonName: plant.common_name,
        scientificName: plant.scientific_name?.[0] || plant.scientific_name,
        family: plant.family,
        origin: details.origin || 'Unknown',
        care: {
          light: details.sunlight?.join(', ') || 'N/A',
          water: details.watering || 'N/A',
          temperature: details.maintenance || 'N/A',
          humidity: details.humidity || 'N/A',
          fertilizer: details.feed || 'N/A',
          pruning: details.pruning || 'N/A',
          additionalTips: details.care_guides || 'N/A'
        }
      });
      
      displayPlantInfo(formattedPlant, 'Perenual API');
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing ${plantName}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
    }
  }
}

testPerenualAPI().catch(console.error);

export default testPerenualAPI;
