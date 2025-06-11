import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

async function getPlantCareInfo(plantId) {
  try {
    const response = await axios.get(
      `${PLANT_ID_API_URL}/knowledge_graph/${plantId}`,
      {
        headers: {
          'Api-Key': PLANT_ID_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data || null;
  } catch (error) {
    console.error('Error fetching plant care info:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.status !== 404) {
        console.error('Response data:', error.response.data);
      }
    }
    return null;
  }
}

async function identifyPlantAndGetCareInfo(imagePath) {
  try {
    console.log(`\n🔍 Identifying plant from file: ${path.basename(imagePath)}`);
    
    const base64Image = encodeImageToBase64(imagePath);
    if (!base64Image) {
      console.error('Failed to encode image');
      return null;
    }

    // First, identify the plant
    const identifyResponse = await axios.post(
      `${PLANT_ID_API_URL}/identify`,
      {
        images: [base64Image],
        plant_details: ['common_names', 'url', 'taxonomy'],
        plant_language: 'en'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PLANT_ID_API_KEY
        }
      }
    );

    if (!identifyResponse.data?.suggestions?.length) {
      console.log('No plant identified in the image');
      return null;
    }

    const topMatch = identifyResponse.data.suggestions[0];
    console.log(`✅ Identified: ${topMatch.plant_name} (${(topMatch.probability * 100).toFixed(1)}% confidence)`);

    // Get care information using the plant ID
    if (topMatch.id) {
      console.log('🌱 Fetching care information...');
      const careInfo = await getPlantCareInfo(topMatch.id);
      
      if (careInfo) {
        return {
          identification: topMatch,
          careInfo: careInfo
        };
      } else {
        console.log('No detailed care information available for this plant');
        return {
          identification: topMatch,
          careInfo: null
        };
      }
    }

    return {
      identification: topMatch,
      careInfo: null
    };

  } catch (error) {
    console.error('Error in plant identification:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    return null;
  }
}

function formatCareInfo(plantData) {
  if (!plantData) return 'No care information available';
  
  const { identification, careInfo } = plantData;
  const plant = identification.plant_details;
  const output = [];

  // Basic plant info
  output.push('🌿 PLANT INFORMATION');
  output.push('='.repeat(50));
  output.push(`🔍 ${plant.scientific_name || 'Unknown'}`);
  if (plant.common_names?.length) {
    output.push(`📛 Common names: ${plant.common_names.join(', ')}`);
  }
  if (plant.taxonomy) {
    const tax = [];
    if (plant.taxonomy.genus) tax.push(`Genus: ${plant.taxonomy.genus}`);
    if (plant.taxonomy.family) tax.push(`Family: ${plant.taxonomy.family}`);
    if (tax.length) output.push(`🌍 ${tax.join(' | ')}`);
  }
  output.push('');

  // Care information
  if (careInfo) {
    output.push('💧 CARE INSTRUCTIONS');
    output.push('='.repeat(50));
    
    if (careInfo.watering) {
      output.push('💧 Watering:');
      output.push(`   - ${careInfo.watering.general || 'No specific watering information'}`);
      if (careInfo.watering.how_often) {
        output.push(`   - Frequency: ${careInfo.watering.how_often.frequency}`);
        output.push(`   - Method: ${careInfo.watering.how_often.method}`);
      }
      output.push('');
    }

    if (careInfo.sunlight) {
      output.push('☀️ Sunlight:');
      if (Array.isArray(careInfo.sunlight)) {
        careInfo.sunlight.forEach(sun => {
          output.push(`   - ${sun}`);
        });
      } else {
        output.push(`   - ${careInfo.sunlight}`);
      }
      output.push('');
    }

    if (careInfo.temperature) {
      output.push('🌡️ Temperature:');
      if (careInfo.temperature.min) {
        output.push(`   - Minimum: ${careInfo.temperature.min}°C`);
      }
      if (careInfo.temperature.max) {
        output.push(`   - Maximum: ${careInfo.temperature.max}°C`);
      }
      if (careInfo.temperature.hardiness) {
        output.push(`   - Hardiness: ${careInfo.temperature.hardiness.zone} (${careInfo.temperature.hardiness.min_temp}°C to ${careInfo.temperature.hardiness.max_temp}°C)`);
      }
      output.push('');
    }

    if (careInfo.soil) {
      output.push('🌱 Soil:');
      if (careInfo.soil.type) {
        output.push(`   - Type: ${careInfo.soil.type}`);
      }
      if (careInfo.soil.ph) {
        output.push(`   - pH: ${careInfo.soil.ph.min || ''} - ${careInfo.soil.ph.max || ''}`);
      }
      output.push('');
    }

    if (careInfo.fertilizer) {
      output.push('🌿 Fertilizer:');
      output.push(`   - ${careInfo.fertilizer.general || 'No specific fertilizer information'}`);
      if (careInfo.fertilizer.how_often) {
        output.push(`   - Frequency: ${careInfo.fertilizer.how_often}`);
      }
      output.push('');
    }

    if (careInfo.pruning) {
      output.push('✂️ Pruning:');
      output.push(`   - ${careInfo.pruning.general || 'No specific pruning information'}`);
      if (careInfo.pruning.when) {
        output.push(`   - When: ${careInfo.pruning.when}`);
      }
      output.push('');
    }
  } else {
    output.push('⚠️ No detailed care information available for this plant.');
    output.push('   Basic care tips will be provided based on plant type.');
    
    // Provide generic care tips based on plant type
    if (plant.taxonomy?.family) {
      output.push('\n🌱 General care tips:');
      
      if (plant.taxonomy.family.includes('Araceae')) {
        output.push('   - Prefers bright, indirect light');
        output.push('   - Water when the top inch of soil is dry');
        output.push('   - Enjoys high humidity');
        output.push('   - Use well-draining soil mix');
      } else if (plant.taxonomy.family.includes('Lamiaceae')) {
        output.push('   - Prefers full sun to partial shade');
        output.push('   - Keep soil consistently moist but not waterlogged');
        output.push('   - Pinch back regularly to encourage bushiness');
      } else {
        output.push('   - Place in bright, indirect light');
        output.push('   - Water when the top inch of soil is dry');
        output.push('   - Protect from extreme temperatures');
      }
    }
  }

  return output.join('\n');
}

async function testPlantCareWithLocalImages() {
  console.log('🌿 Testing Plant Care Information with Plant.id API...');
  
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
      console.log('='.repeat(60));
      const result = await identifyPlantAndGetCareInfo(imagePath);
      
      if (!result) {
        console.log('❌ Could not identify plant or fetch care information');
        continue;
      }
      
      console.log('\n' + formatCareInfo(result));
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error processing image ${path.basename(imagePath)}:`, error.message);
    }
  }
}

testPlantCareWithLocalImages().catch(console.error);
