// Manual test file for plantStorage.js
// Run with: node services/__tests__/manualStorageTest.js

// Import the functions to test
const { savePlant, getSavedPlants, deletePlant, AsyncStorage } = require('../plantStorage');

// Helper function to test async functions
async function test(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}: ${error.message}`);
    throw error;
  }
}

// Test data
const mockPlantData = {
  suggestions: [{
    plant_details: {
      common_names: ['Test Plant'],
      scientific_name: 'Testus plantus',
      family: 'Testaceae',
      genus: 'Testus'
    }
  }],
  plantInfo: {
    careGuide: {
      light: 'Bright indirect light',
      water: 'When top inch of soil is dry'
    }
  }
};

async function runTests() {
  console.log('=== Starting Manual Storage Tests ===\n');
  
  try {
    // Clear any existing data
    AsyncStorage._storage = {};
    
    // Test 1: Save a plant
    await test('Should save a plant successfully', async () => {
      const savedPlant = await savePlant(mockPlantData);
      if (!savedPlant || !savedPlant.id) {
        throw new Error('Plant was not saved correctly');
      }
      console.log('   - ID:', savedPlant.id);
      console.log('   - Name:', savedPlant.plantName);
    });
    
    // Test 2: Get all plants
    await test('Should retrieve saved plants', async () => {
      const plants = await getSavedPlants();
      if (plants.length !== 1) {
        throw new Error(`Expected 1 plant, got ${plants.length}`);
      }
      console.log(`   - Found ${plants.length} plants`);
      console.log('   - First plant name:', plants[0].plantName);
    });
    
    // Test 3: Prevent duplicates
    await test('Should prevent duplicate plants', async () => {
      try {
        await savePlant(mockPlantData);
        throw new Error('Should have thrown a duplicate error');
      } catch (error) {
        if (!error.message.includes('already been saved')) {
          throw new Error('Unexpected error: ' + error.message);
        }
        console.log('   - Correctly prevented duplicate plant');
      }
    });
    
    // Test 4: Delete a plant
    await test('Should delete a plant', async () => {
      const plants = await getSavedPlants();
      const deleteResult = await deletePlant(plants[0].id);
      if (!deleteResult) {
        throw new Error('Delete operation failed');
      }
      
      // Verify deletion
      const remainingPlants = await getSavedPlants();
      if (remainingPlants.length !== 0) {
        throw new Error(`Expected 0 plants after deletion, got ${remainingPlants.length}`);
      }
      console.log('   - Plant deleted successfully');
    });
    
    console.log('\n=== All tests completed successfully! ===');
  } catch (error) {
    console.error('\n=== Test failed: ===');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();
