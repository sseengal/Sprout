import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const PLANT_ID_API_URL = 'https://api.plant.id/v2';

// Function to encode file data to base64
function encodeImageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error reading image file:', error.message);
    return null;
  }
}

async function identifyPlantFromFile(imagePath) {
  try {
    console.log(`\n🔍 Identifying plant from file: ${imagePath}`);
    
    const base64Image = encodeImageToBase64(imagePath);
    if (!base64Image) {
      console.error('Failed to encode image');
      return null;
    }

    const formData = new FormData();
    formData.append('images', fs.createReadStream(imagePath));
    
    const response = await axios.post(
      `${PLANT_ID_API_URL}/identify`,
      {
        images: [base64Image],
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

async function testPlantIdWithLocalImage() {
  console.log('🌿 Testing Plant.id API with local image...');
  
  // Create a test-images directory if it doesn't exist
  const testImagesDir = path.join(__dirname, 'test-images');
  if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir, { recursive: true });
    console.log(`ℹ️  Please add some test images to: ${testImagesDir}`);
    return;
  }
  
  // Get all image files from the test-images directory
  const imageFiles = fs.readdirSync(testImagesDir)
    .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
    .map(file => path.join(testImagesDir, file));
  
  if (imageFiles.length === 0) {
    console.log(`ℹ️  No test images found in: ${testImagesDir}`);
    console.log('Please add some test images to the directory and try again.');
    return;
  }
  
  console.log(`Found ${imageFiles.length} test image(s)`);
  
  for (const imagePath of imageFiles) {
    try {
      const result = await identifyPlantFromFile(imagePath);
      
      if (!result || !result.suggestions || result.suggestions.length === 0) {
        console.log('\n❌ No identification results');
        continue;
      }
      
      console.log(`\n✅ Identification successful for: ${path.basename(imagePath)}`);
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
      console.error(`Error processing image ${path.basename(imagePath)}:`, error.message);
    }
  }
}

testPlantIdWithLocalImage().catch(console.error);
