import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PERENUAL_API_KEY = process.env.PERENUAL_API_KEY;
const PERENUAL_API_URL = 'https://perenual.com/api';

// Common houseplants to test
const TEST_PLANTS = [
  'monstera deliciosa',
  'sansevieria trifasciata',
  'epipremnum aureum',
  'ficus lyrata',
  'zamioculcas zamiifolia'
];

async function searchPlants(query) {
  try {
    const response = await axios.get(`${PERENUAL_API_URL}/species-list`, {
      params: {
        key: PERENUAL_API_KEY,
        q: query,
        page: 1
      }
    });
    return response.data?.data || [];
  } catch (error) {
    console.error('Error searching plants:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

async function getPlantDetails(plantId) {
  try {
    const response = await axios.get(`${PERENUAL_API_URL}/species/details/${plantId}`, {
      params: {
        key: PERENUAL_API_KEY
      }
    });
    return response.data || null;
  } catch (error) {
    console.error('Error fetching plant details:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.status !== 404) {
        console.error('Response data:', error.response.data);
      }
    }
    return null;
  }
}

function formatCareInfo(plant) {
  if (!plant) return 'No plant information available';
  
  const output = [];
  output.push('🌿 PLANT INFORMATION');
  output.push('='.repeat(60));
  output.push(`🔍 ${plant.scientific_name?.[0] || 'Unknown'}`);
  output.push(`📛 Common name: ${plant.common_name || 'N/A'}`);
  output.push(`🌍 Family: ${plant.family || 'N/A'}`);
  output.push(`🌱 Type: ${plant.type || 'N/A'}`);
  output.push('');

  // Watering
  output.push('💧 WATERING');
  output.push('='.repeat(60));
  output.push(`Frequency: ${plant.watering || 'N/A'}`);
  output.push(plant.description || 'No watering information available.');
  output.push('');

  // Sunlight
  output.push('☀️ SUNLIGHT');
  output.push('='.repeat(60));
  if (plant.sunlight && plant.sunlight.length > 0) {
    plant.sunlight.forEach((item, index) => {
      output.push(`${index + 1}. ${item}`);
    });
  } else {
    output.push('No sunlight information available.');
  }
  output.push('');

  // Care Guides
  if (plant.care_guides) {
    output.push('📚 CARE GUIDES');
    output.push('='.repeat(60));
    Object.entries(plant.care_guides).forEach(([key, value]) => {
      if (value) {
        output.push(`• ${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
      }
    });
  }

  // Additional Information
  output.push('\nℹ️ ADDITIONAL INFORMATION');
  output.push('='.repeat(60));
  
  const additionalInfo = [
    { emoji: '🌡️', key: 'temperature', label: 'Temperature' },
    { emoji: '💧', key: 'humidity', label: 'Humidity' },
    { emoji: '🌱', key: 'soil', label: 'Soil' },
    { emoji: '🍃', key: 'fertilizer', label: 'Fertilizer' },
    { emoji: '✂️', key: 'pruning', label: 'Pruning' },
    { emoji: '🐛', key: 'pests', label: 'Pests' },
    { emoji: '⚠️', key: 'toxicity', label: 'Toxicity' },
  ];

  additionalInfo.forEach(({ emoji, key, label }) => {
    if (plant[key]) {
      output.push(`${emoji} ${label}: ${plant[key]}`);
    }
  });

  return output.join('\n');
}

async function testPerenualAPI() {
  console.log('🌿 Testing Perenual API for Plant Care Information...');
  
  if (!PERENUAL_API_KEY) {
    console.error('❌ PERENUAL_API_KEY is not set in the .env file');
    return;
  }
  
  for (const plantName of TEST_PLANTS) {
    try {
      console.log('\n' + '='.repeat(80));
      console.log(`🔍 Searching for: ${plantName}`);
      
      // Search for the plant
      const searchResults = await searchPlants(plantName);
      
      if (searchResults.length === 0) {
        console.log(`❌ No results found for: ${plantName}`);
        continue;
      }
      
      // Get details for the first result
      const plantDetails = await getPlantDetails(searchResults[0].id);
      
      if (!plantDetails) {
        console.log(`❌ Could not fetch details for: ${plantName}`);
        continue;
      }
      
      console.log(`\n✅ Found: ${plantDetails.common_name || plantName}`);
      console.log('\n' + formatCareInfo(plantDetails));
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error processing ${plantName}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 Testing completed!');
}

testPerenualAPI().catch(console.error);
