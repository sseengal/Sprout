import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const PLANT_ID_API_URL = 'https://api.plant.id/v2';

// Test with multiple sample images
const SAMPLE_IMAGES = [
  'https://bs.plantnet.org/image/o/3f3c9b57c81936665e7a17316b82cb7fbfb6a4f6', // Monstera
  'https://bs.plantnet.org/image/o/8b3c9b57c81936665e7a17316b82cb7fbfb6a4f6', // Sansevieria
  'https://bs.plantnet.org/image/o/9f3c9b57c81936665e7a17316b82cb7fbfb6a4f6', // Pothos
  'https://bs.plantnet.org/image/o/2f3c9b57c81936665e7a17316b82cb7fbfb6a4f6', // Fiddle Leaf Fig
  'https://bs.plantnet.org/image/o/1f3c9b57c81936665e7a17316b82cb7fbfb6a4f6'  // ZZ Plant
];

// Alternative image URLs in case the PlantNet ones don't work
const ALTERNATIVE_IMAGES = [
  'https://www.gardeningknowhow.com/wp-content/uploads/2019/09/monstera-400x300.jpg',
  'https://www.gardeningknowhow.com/wp-content/uploads/2011/06/snake-plant.jpg',
  'https://www.gardeningknowhow.com/wp-content/uploads/2019/09/pothos-400x300.jpg',
  'https://www.gardeningknowhow.com/wp-content/uploads/2019/09/fiddle-leaf-fig-400x300.jpg',
  'https://www.gardeningknowhow.com/wp-content/uploads/2019/09/zz-plant-400x300.jpg'
];

async function identifyPlant(imageUrl, useAlternative = false) {
  try {
    console.log(`\n🔍 Identifying plant from image: ${imageUrl}`);
    
    // First, try to download the image to check if it exists
    try {
      await axios.head(imageUrl);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`Image not found (404): ${imageUrl}`);
        if (!useAlternative) {
          console.log('Trying alternative image...');
          return identifyPlant(ALTERNATIVE_IMAGES[SAMPLE_IMAGES.indexOf(imageUrl)], true);
        }
      }
      throw error;
    }

    const response = await axios.post(
      `${PLANT_ID_API_URL}/identify`,
      {
        images: [imageUrl],
        plant_details: ['common_names', 'url', 'wiki_description', 'taxonomy', 'wiki_image'],
        plant_language: 'en'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PLANT_ID_API_KEY
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error identifying plant:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

function formatPlantDetails(plant) {
  if (!plant) return 'No plant details available';
  
  const details = [];
  details.push(`🌱 ${plant.scientific_name || 'Unknown'}`);
  
  if (plant.common_names && plant.common_names.length > 0) {
    details.push(`🌿 Common names: ${plant.common_names.join(', ')}`);
  }
  
  if (plant.probability) {
    details.push(`📊 Match confidence: ${(plant.probability * 100).toFixed(1)}%`);
  }
  
  if (plant.taxonomy) {
    const tax = plant.taxonomy;
    const taxonomyParts = [];
    if (tax.genus) taxonomyParts.push(`Genus: ${tax.genus}`);
    if (tax.family) taxonomyParts.push(`Family: ${tax.family}`);
    if (tax.order) taxonomyParts.push(`Order: ${tax.order}`);
    if (taxonomyParts.length > 0) {
      details.push(`🌍 ${taxonomyParts.join(' | ')}`);
    }
  }
  
  if (plant.url) {
    details.push(`🔗 More info: ${plant.url}`);
  }
  
  return details.join('\n');
}

async function testPlantIdAPI() {
  console.log('🌿 Testing Plant.id API...');
  
  for (const imageUrl of SAMPLE_IMAGES) {
    try {
      const result = await identifyPlant(imageUrl);
      
      if (!result || !result.suggestions || result.suggestions.length === 0) {
        console.log('\n❌ No identification results');
        continue;
      }
      
      console.log('\n✅ Identification successful!');
      console.log('='.repeat(60));
      
      // Show top 3 matches
      for (let i = 0; i < Math.min(3, result.suggestions.length); i++) {
        const plant = result.suggestions[i];
        console.log(`\n#${i + 1} ${plant.plant_name} (${(plant.probability * 100).toFixed(1)}% match)`);
        console.log('='.repeat(60));
        console.log(formatPlantDetails(plant.plant_details));
        console.log('='.repeat(60));
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error processing image ${imageUrl}:`, error.message);
    }
  }
}

testPlantIdAPI().catch(console.error);
