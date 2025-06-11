import axios from 'axios';
import { PLANT_NAMES, formatPlantInfo, displayPlantInfo } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GARDEN_ORG_API_URL = 'https://garden.org/api';

async function searchPlant(query) {
  try {
    const response = await axios.get(`${GARDEN_ORG_API_URL}/plants/search`, {
      params: {
        q: query,
        page: 1,
        limit: 5
      }
    });
    
    if (response.data && response.data.matches && response.data.matches.length > 0) {
      // Get the first matching plant's details
      return await getPlantDetails(response.data.matches[0].id);
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
    const response = await axios.get(`${GARDEN_ORG_API_URL}/plants/plant/${plantId}`);
    return response.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    return null;
  }
}

async function testGardenOrgAPI() {
  console.log('🌿 Testing Garden.org API...');
  
  for (const plantName of PLANT_NAMES) {
    try {
      console.log(`\n🔍 Searching for: ${plantName}`);
      const plantData = await searchPlant(plantName);
      
      if (!plantData) {
        console.log(`No results found for ${plantName}`);
        continue;
      }
      
      console.log(`\n✅ Found: ${plantData.common_name || plantName}`);
      
      const formattedPlant = formatPlantInfo({
        commonName: plantData.common_name || plantName,
        scientificName: plantData.scientific_name || 'N/A',
        family: plantData.family_common_name || 'N/A',
        origin: plantData.origin || 'N/A',
        care: {
          light: plantData.sun_requirements || 'N/A',
          water: plantData.watering || 'N/A',
          temperature: plantData.hardiness ? 
            `Hardiness: ${plantData.hardiness.min_temp_f}°F - ${plantData.hardiness.max_temp_f}°F` : 'N/A',
          additionalTips: plantData.growth || 'N/A'
        }
      });
      
      displayPlantInfo(formattedPlant, 'Garden.org API');
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing ${plantName}:`, error.message);
    }
  }
}

testGardenOrgAPI().catch(console.error);
