import axios from 'axios';
import { PLANT_NAMES, formatPlantInfo, displayPlantInfo } from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

// Note: You'll need to sign up at https://web.plant.id/ to get an API key

// Note: You'll need to sign up at https://web.plant.id/ to get an API key
const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const API_URL = 'https://api.plant.id/v2';

// We'll use a sample image URL for testing
const SAMPLE_IMAGE_URL = 'https://bs.plantnet.org/image/o/3f3c9b57c81936665e7a17316b82cb7fbfb6a4f6';

async function identifyPlant(imageUrl) {
  try {
    const response = await axios.post(
      `${API_URL}/identify`,
      {
        images: [imageUrl],
        plant_details: ['common_names', 'url', 'wiki_description', 'wiki_image', 'taxonomy']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PLANT_ID_API_KEY
        }
      }
    );
    
    if (response.data && response.data.suggestions && response.data.suggestions.length > 0) {
      return response.data.suggestions[0];
    }
    return null;
  } catch (error) {
    console.error('Error identifying plant:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function getPlantDetails(plantId) {
  try {
    const response = await axios.get(`${API_URL}/species/${plantId}`, {
      headers: {
        'Api-Key': PLANT_ID_API_KEY
      }
    });
    return response.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    return null;
  }
}

async function testPlantIdAPI() {
  if (!PLANT_ID_API_KEY) {
    console.error('❌ Plant.id API key not found in .env file');
    console.log('ℹ️  Sign up at https://web.plant.id/ to get an API key');
    return;
  }

  console.log('🌿 Testing Plant.id API...');
  
  try {
    console.log('\n🔍 Identifying plant from sample image...');
    const identification = await identifyPlant(SAMPLE_IMAGE_URL);
    
    if (!identification) {
      console.log('No identification results');
      return;
    }
    
    console.log(`\n✅ Identified as: ${identification.plant_name} (${identification.plant_details.scientific_name})`);
    console.log(`   Probability: ${(identification.probability * 100).toFixed(1)}%`);
    
    const formattedPlant = formatPlantInfo({
      commonName: identification.plant_name,
      scientificName: identification.plant_details.scientific_name,
      family: identification.plant_details.family,
      origin: 'N/A', // Not provided in the free tier
      care: {
        light: 'N/A', // Not provided in the free tier
        water: 'N/A', // Not provided in the free tier
        temperature: 'N/A', // Not provided in the free tier
        humidity: 'N/A', // Not provided in the free tier
        additionalTips: identification.plant_details.wiki_description || 'N/A'
      }
    });
    
    displayPlantInfo(formattedPlant, 'Plant.id API');
    
  } catch (error) {
    console.error('Error testing Plant.id API:', error.message);
  }
}

testPlantIdAPI().catch(console.error);

export default testPlantIdAPI;
