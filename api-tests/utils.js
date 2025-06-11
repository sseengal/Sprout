import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLANT_NAMES = [
  'Monstera deliciosa',
  'Sansevieria trifasciata',
  'Epipremnum aureum',
  'Ficus lyrata',
  'Zamioculcas zamiifolia'
];

function formatPlantInfo(plant) {
  return {
    commonName: plant.common_name || plant.commonName || 'N/A',
    scientificName: plant.scientific_name || plant.scientificName || plant.latin_name || 'N/A',
    family: plant.family || 'N/A',
    origin: plant.origin || 'N/A',
    care: {
      light: plant.light || plant.sunlight || 'N/A',
      water: plant.watering || plant.water || 'N/A',
      temperature: plant.temperature || 'N/A',
      humidity: plant.humidity || 'N/A',
      fertilizer: plant.fertilizer || 'N/A',
      toxicity: plant.toxicity || 'N/A',
      pruning: plant.pruning || 'N/A',
      additionalTips: plant.additional_care || 'N/A'
    }
  };
}

function displayPlantInfo(plant, apiName) {
  console.log(`\n🌱 ${apiName} Results for: ${plant.scientificName || 'Unknown Plant'}`);
  console.log('='.repeat(60));
  
  console.log(`\n📝 Basic Information`);
  console.log(`Common Name: ${plant.commonName}`);
  console.log(`Scientific Name: ${plant.scientificName}`);
  console.log(`Family: ${plant.family}`);
  console.log(`Origin: ${plant.origin}`);
  
  console.log(`\n🌿 Care Information`);
  console.log(`💡 Light: ${plant.care.light}`);
  console.log(`💧 Water: ${plant.care.water}`);
  console.log(`🌡️ Temperature: ${plant.care.temperature}`);
  console.log(`💦 Humidity: ${plant.care.humidity}`);
  
  if (plant.care.fertilizer !== 'N/A') console.log(`🌱 Fertilizer: ${plant.care.fertilizer}`);
  if (plant.care.toxicity !== 'N/A') console.log(`⚠️ Toxicity: ${plant.care.toxicity}`);
  if (plant.care.pruning !== 'N/A') console.log(`✂️ Pruning: ${plant.care.pruning}`);
  if (plant.care.additionalTips !== 'N/A') console.log(`💡 Additional Tips: ${plant.care.additionalTips}`);
  
  console.log('='.repeat(60));
}

export {
  PLANT_NAMES,
  formatPlantInfo,
  displayPlantInfo
};
