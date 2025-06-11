import axios from 'axios';
import { PLANT_NAMES, formatPlantInfo, displayPlantInfo } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

const TREFLES_API_KEY = process.env.TREFLE_API_KEY;
const API_URL = 'https://trefle.io/api/v1';

async function searchPlant(query) {
  try {
    const response = await axios.get(`${API_URL}/plants/search`, {
      params: { q: query, token: TREFLES_API_KEY }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching plant:', error.message);
    return null;
  }
}

async function getPlantDetails(plantId) {
  try {
    const response = await axios.get(`${API_URL}/species/${plantId}`, {
      params: { token: TREFLES_API_KEY }
    });
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    return null;
  }
}

async function testTrefleAPI() {
  if (!TREFLES_API_KEY) {
    console.error('❌ Trefle API key not found in .env file');
    return;
  }

  console.log('🌿 Testing Trefle API...');
  
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
        common_name: plant.common_name,
        scientific_name: plant.scientific_name,
        family: details.family_common_name || details.family,
        origin: details.distribution?.native_to || 'Unknown',
        light: details.growth?.light || 'N/A',
        water: details.growth?.ph?.preference || 'N/A',
        temperature: details.growth?.temperature_minimum?.deg_c ? 
          `${details.growth.temperature_minimum.deg_c}°C - ${details.growth.temperature_maximum?.deg_c || 'N/A'}°C` : 'N/A',
        humidity: details.growth?.atmospheric_humidity || 'N/A',
        toxicity: details.toxicity || 'N/A'
      });
      
      displayPlantInfo(formattedPlant, 'Trefle API');
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing ${plantName}:`, error.message);
    }
  }
}

testTrefleAPI().catch(console.error);

export default testTrefleAPI;
