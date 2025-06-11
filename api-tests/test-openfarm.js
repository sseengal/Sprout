import axios from 'axios';
import { PLANT_NAMES, formatPlantInfo, displayPlantInfo } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OPENFARM_API_URL = 'https://openfarm.cc/api/v1';

async function searchPlant(query) {
  try {
    const response = await axios.get(`${OPENFARM_API_URL}/crops`, {
      params: {
        filter: query,
        page: 1,
        per_page: 5
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      // Get the first matching plant's details
      const plantId = response.data.data[0].id;
      return await getPlantDetails(plantId);
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
    const response = await axios.get(`${OPENFARM_API_URL}/crops/${plantId}`);
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    return null;
  }
}

async function testOpenFarmAPI() {
  console.log('🌿 Testing OpenFarm API...');
  
  for (const plantName of PLANT_NAMES) {
    try {
      console.log(`\n🔍 Searching for: ${plantName}`);
      const plantData = await searchPlant(plantName);
      
      if (!plantData) {
        console.log(`No results found for ${plantName}`);
        continue;
      }
      
      console.log(`\n✅ Found: ${plantData.attributes.name || plantName}`);
      
      const attributes = plantData.attributes || {};
      const growing = attributes.growing_information || {};
      
      const formattedPlant = formatPlantInfo({
        commonName: attributes.name || plantName,
        scientificName: attributes.binomial_name || 'N/A',
        family: attributes.taxonomy?.family || 'N/A',
        origin: attributes.taxonomy?.genus ? `Genus: ${attributes.taxonomy.genus}` : 'N/A',
        care: {
          light: growing.light || 'N/A',
          water: growing.watering || 'N/A',
          temperature: growing.temperature || 'N/A',
          additionalTips: growing.general || 'N/A'
        }
      });
      
      displayPlantInfo(formattedPlant, 'OpenFarm API');
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing ${plantName}:`, error.message);
    }
  }
}

testOpenFarmAPI().catch(console.error);
