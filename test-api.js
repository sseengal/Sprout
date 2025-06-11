require('dotenv').config();
const axios = require('axios');

async function testHousePlantsAPI() {
  try {
    const baseUrl = 'https://house-plants2.p.rapidapi.com';
    const headers = {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'house-plants2.p.rapidapi.com'
    };

    // 1. Get first 10 plants and check each for care info
    console.log('\n🔍 Checking first 10 plants for care information...');
    const plantsRes = await axios.get(`${baseUrl}/all-lite`, { headers });
    const plantsToCheck = plantsRes.data.slice(0, 10);
    
    let foundCareInfo = false;
    
    for (const plant of plantsToCheck) {
      if (!plant['Latin name']) continue;
      
      console.log(`\n🌱 Checking: ${plant['Common name']?.[0] || 'Unnamed Plant'} (${plant['Latin name']})`);
      
      try {
        // Try to get care information using the Latin name
        const careRes = await axios.get(`${baseUrl}/id/${encodeURIComponent(plant['Latin name'])}`, { 
          headers,
          validateStatus: status => status < 500 // Don't throw on 404
        });
        
        if (careRes.data && Object.keys(careRes.data).length > 0) {
          console.log('✅ Found care information:');
          
          // Display available care information
          const careInfo = careRes.data;
          
          if (careInfo['Temperature']) console.log(`🌡️  Temperature: ${careInfo['Temperature']}`);
          if (careInfo['Light']) console.log(`💡 Light: ${careInfo['Light']}`);
          if (careInfo['Watering']) console.log(`💧 Watering: ${careInfo['Watering']}`);
          if (careInfo['Humidity']) console.log(`💦 Humidity: ${careInfo['Humidity']}`);
          if (careInfo['Fertilizer']) console.log(`🌱 Fertilizer: ${careInfo['Fertilizer']}`);
          if (careInfo['Toxicity']) console.log(`⚠️  Toxicity: ${careInfo['Toxicity']}`);
          if (careInfo['Pruning']) console.log(`✂️  Pruning: ${careInfo['Pruning']}`);
          
          foundCareInfo = true;
          break; // Stop after finding the first plant with care info
        } else {
          console.log('ℹ️  No detailed care information available.');
        }
      } catch (error) {
        console.log('ℹ️  Could not fetch care information for this plant.');
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!foundCareInfo) {
      console.log('\nℹ️  No detailed care information found in the first 10 plants. The API might have limited care information in the free tier.');
    }
    
    console.log('\n✅ Successfully tested House Plants API!');
  } catch (error) {
    console.error('❌ Error testing House Plants API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testHousePlantsAPI();
