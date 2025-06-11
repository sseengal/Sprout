import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;
const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';

// Test with local images
async function testPlantNetWithLocalImage(imagePath) {
  try {
    console.log(`\n🔍 Testing PlantNet with image: ${path.basename(imagePath)}`);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Image not found: ${imagePath}`);
      return null;
    }

    // Create form data
    const formData = new FormData();
    formData.append('organs', 'auto');
    formData.append('images', fs.createReadStream(imagePath));
    
    // Make the API request
    const response = await axios.post(
      `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error in PlantNet API request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

function formatPlantNetResults(data) {
  if (!data?.results?.length) {
    return 'No identification results';
  }

  const output = [];
  output.push('🌿 PLANT IDENTIFICATION RESULTS');
  output.push('='.repeat(60));

  // Show top 3 matches
  data.results.slice(0, 3).forEach((result, index) => {
    const score = (result.score * 100).toFixed(1);
    const scientificName = result.species.scientificNameWithoutAuthor || 'Unknown';
    const commonNames = result.species.commonNames?.join(', ') || 'No common names';
    const family = result.species.family?.scientificNameWithoutAuthor || 'Unknown family';
    const genus = result.species.genus?.scientificNameWithoutAuthor || 'Unknown genus';
    
    output.push(`\n#${index + 1} ${scientificName} (${score}% match)`);
    output.push('='.repeat(60));
    output.push(`📛 Common names: ${commonNames}`);
    output.push(`🌍 Family: ${family}`);
    output.push(`🌱 Genus: ${genus}`);
    
    // Check for GBIF ID to potentially fetch more information
    if (result.species.gbifId) {
      output.push(`🔍 GBIF ID: ${result.species.gbifId}`);
      output.push(`🌐 More info: https://www.gbif.org/species/${result.species.gbifId}`);
    }
    
    output.push('\n📝 Note: PlantNet focuses on plant identification and does not provide care information.');
  });

  return output.join('\n');
}

async function testAllImages() {
  console.log('🌿 Testing PlantNet API...');
  
  // Check test-images directory
  const testImagesDir = path.join(__dirname, 'test-images');
  if (!fs.existsSync(testImagesDir)) {
    console.error(`❌ Test images directory not found: ${testImagesDir}`);
    return;
  }
  
  // Get all image files
  const imageFiles = fs.readdirSync(testImagesDir)
    .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
    .map(file => path.join(testImagesDir, file));
  
  if (imageFiles.length === 0) {
    console.log(`ℹ️  No test images found in: ${testImagesDir}`);
    console.log('Please add some test images to the directory and try again.');
    return;
  }
  
  console.log(`Found ${imageFiles.length} test image(s)\n`);
  
  for (const imagePath of imageFiles) {
    try {
      console.log('\n' + '='.repeat(80));
      console.log(`🔍 Processing: ${path.basename(imagePath)}`);
      
      const result = await testPlantNetWithLocalImage(imagePath);
      
      if (!result) {
        console.log('❌ No results or error occurred');
        continue;
      }
      
      console.log('\n' + formatPlantNetResults(result));
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error processing image ${path.basename(imagePath)}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 Summary:');
  console.log('PlantNet is primarily an identification service and does not provide plant care information.');
  console.log('For care information, consider using:');
  console.log('1. The Plant.id API (which we already tested)');
  console.log('2. A dedicated plant care API like Perenual or House Plants API');
  console.log('3. A local database of plant care information');
}

// Run the test
testAllImages().catch(console.error);
