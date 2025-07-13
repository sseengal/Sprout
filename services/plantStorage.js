// Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStandardPlantData, isValidPlantData } from '../utils/plantDataModel';

// Simple storage wrapper
const storage = {
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  getItem: (key) => AsyncStorage.getItem(key),
  removeItem: (key) => AsyncStorage.removeItem(key),
  clear: () => AsyncStorage.clear()
};

const SAVED_PLANTS_KEY = '@saved_plants';

/**
 * Extracts the plant's common name from the plant data
 */
const getPlantName = (plantData) => {
  return (
    plantData?.suggestions?.[0]?.plant_details?.common_names?.[0] ||
    plantData?.housePlantData?.commonNames?.[0] ||
    'Unknown Plant'
  );
};

/**
 * Extracts the plant's scientific name from the plant data
 */
const getScientificName = (plantData) => {
  return (
    plantData?.housePlantData?.scientificName ||
    plantData?.suggestions?.[0]?.plant_details?.scientific_name ||
    null
  );
};

/**
 * Extracts plant details from the API response
 */
const extractPlantDetails = (plantData) => {
  const details = {};
  
  // Extract from PlantNet data
  if (plantData?.suggestions?.[0]?.plant_details) {
    const plantDetails = plantData.suggestions[0].plant_details;
    details.commonNames = plantDetails.common_names || [];
    details.scientificName = plantDetails.scientific_name;
    details.family = plantDetails.family;
    details.genus = plantDetails.genus;
  }
  
  // Extract from House Plant data if available
  if (plantData?.housePlantData) {
    const hpData = plantData.housePlantData;
    details.commonNames = details.commonNames || hpData.commonNames || [];
    details.scientificName = details.scientificName || hpData.scientificName;
    details.family = details.family || hpData.family;
    details.genus = details.genus || hpData.genus;
  }
  
  return details;
};

/**
 * Extracts care information from the plant data
 */
const extractCareInfo = (plantData) => {
  // If we have Gemini AI care info
  if (plantData?.plantInfo?.careGuide) {
    return plantData.plantInfo.careGuide;
  }
  
  // Fallback to basic care info if available
  if (plantData?.housePlantData?.care) {
    return {
      light: plantData.housePlantData.care.light,
      water: plantData.housePlantData.care.water,
      temperature: plantData.housePlantData.care.temperature,
      humidity: plantData.housePlantData.care.humidity,
    };
  }
  
  return {};
};

/**
 * Transforms the plant data into our storage format
 */
const transformPlantData = (plantData) => {
  return {
    id: Date.now().toString(),
    savedAt: Date.now(),
    plantName: getPlantName(plantData),
    scientificName: getScientificName(plantData),
    details: extractPlantDetails(plantData),
    careInfo: extractCareInfo(plantData),
    // Store the full plant data for future use
    originalData: plantData
  };
};

/**
 * Saves a plant to local storage using the standardized model
 * @param {Object} plantData - The plant data or options for creating standardized plant data
 * @returns {Promise<Object>} The saved plant object
 */
export const savePlant = async (plantData) => {
  try {
    // Get existing plants
    const existingPlants = await storage.getItem(SAVED_PLANTS_KEY);
    const plants = existingPlants ? JSON.parse(existingPlants) : [];

    // Convert to standardized format if needed
    const plantToSave = isValidPlantData(plantData) 
      ? plantData 
      : createStandardPlantData(plantData);
    
    // Check for duplicates by id, scientific name, or image+name combination
    const isDuplicate = plants.some(plant => 
      (plantToSave.id && plant.id === plantToSave.id) ||
      (plantToSave.scientificName && plant.scientificName === plantToSave.scientificName) ||
      (plantToSave.imageUri && plantToSave.commonName && 
       plant.imageUri === plantToSave.imageUri && 
       plant.commonName === plantToSave.commonName)
    );

    if (isDuplicate) {
      throw new Error('This plant has already been saved');
    }

    // Add the new plant
    plants.push(plantToSave);

    // Save back to storage
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    
    return plantToSave;
  } catch (error) {
    console.error('Error saving plant:', error);
    throw error; // Re-throw to allow handling in the UI
  }
};

/**
 * Retrieves all saved plants
 * @returns {Promise<Array>} Array of saved plants
 */
export const getSavedPlants = async () => {
  try {
    const savedPlants = await storage.getItem(SAVED_PLANTS_KEY);
    return savedPlants ? JSON.parse(savedPlants) : [];
  } catch (error) {
    console.error('Error getting saved plants:', error);
    return [];
  }
};

/**
 * Retrieves a specific plant by ID
 * @param {string} plantId - The ID of the plant to retrieve
 * @returns {Promise<Object|null>} The plant object or null if not found
 */
export const getPlantById = async (plantId) => {
  try {
    const plants = await getSavedPlants();
    return plants.find(plant => plant.id === plantId) || null;
  } catch (error) {
    console.error('Error getting plant by ID:', error);
    return null;
  }
};

/**
 * Deletes a saved plant by ID and cleans up associated reminders
 * @param {string} plantId - The ID of the plant to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deletePlant = async (plantId) => {
  try {
    console.log(`[DEBUG] Deleting plant with ID: ${plantId}`);
    
    // Delete the plant from storage
    const savedPlants = await storage.getItem(SAVED_PLANTS_KEY);
    let plants = savedPlants ? JSON.parse(savedPlants) : [];
    
    const initialLength = plants.length;
    plants = plants.filter(plant => plant.id !== String(plantId));
    
    if (plants.length === initialLength) {
      console.log(`[DEBUG] No plant found with ID: ${plantId}`);
      return false; // No plant was deleted
    }
    
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    console.log(`[DEBUG] Plant deleted from storage: ${plantId}`);
    
    // Clean up reminders for the deleted plant
    try {
      // Get all reminders
      const REMINDERS_KEY = 'SPROUT_CARE_REMINDERS';
      const storedReminders = await AsyncStorage.getItem(REMINDERS_KEY);
      
      if (storedReminders) {
        const reminders = JSON.parse(storedReminders);
        const plantIdStr = String(plantId);
        
        // Filter out reminders for the deleted plant
        const updatedReminders = reminders.filter(reminder => {
          if (String(reminder.plant_id) !== plantIdStr) {
            return true;
          }
          
          // For reminders being removed, try to cancel their notifications
          try {
            console.log(`[DEBUG] Cancelling notification for reminder ${reminder.id}`);
            // Import might not be available here, so we'll use a direct call
            if (global.Notifications) {
              global.Notifications.cancelScheduledNotificationAsync(`reminder-${reminder.id}`)
                .catch(err => console.log(`Error cancelling notification: ${err}`));
            }
          } catch (notifError) {
            console.error(`Error handling notification for reminder ${reminder.id}:`, notifError);
          }
          
          return false;
        });
        
        // Save the updated reminders list
        if (updatedReminders.length !== reminders.length) {
          console.log(`[DEBUG] Removed ${reminders.length - updatedReminders.length} reminders for plant ${plantId}`);
          await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedReminders));
        } else {
          console.log(`[DEBUG] No reminders found for plant ${plantId}`);
        }
      }
    } catch (reminderError) {
      console.error('Error cleaning up reminders:', reminderError);
      // Continue with plant deletion even if reminder cleanup fails
    }
    
    // Publish event for other contexts to detect
    await AsyncStorage.setItem('PLANT_DELETED_EVENT', JSON.stringify({
      plantId: String(plantId),
      timestamp: Date.now()
    }));
    console.log(`[DEBUG] Published plant deletion event for ID: ${plantId}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting plant:', error);
    return false;
  }
};

/**
 * Updates an existing plant
 * @param {string} plantId - The ID of the plant to update
 * @param {Object} updatedData - The new data to merge with existing plant data
 * @returns {Promise<Object|null>} The updated plant or null if not found
 */
export const updatePlant = async (plantId, updatedData) => {
  try {
    const savedPlants = await storage.getItem(SAVED_PLANTS_KEY);
    let plants = savedPlants ? JSON.parse(savedPlants) : [];
    
    const plantIndex = plants.findIndex(plant => plant.id === String(plantId));
    
    if (plantIndex === -1) {
      return null; // Plant not found
    }
    
    // Merge the updated data with the existing plant
    const updatedPlant = {
      ...plants[plantIndex],
      ...updatedData,
      id: plants[plantIndex].id, // Ensure ID doesn't change
      updatedAt: Date.now()
    };
    
    plants[plantIndex] = updatedPlant;
    
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    return updatedPlant;
  } catch (error) {
    console.error('Error updating plant:', error);
    return null;
  }
};

/**
 * Get all journal entries for a specific plant
 * @param {string} plantId - The ID of the plant
 * @returns {Promise<Array>} Array of journal entries
 */
export const getJournalEntries = async (plantId) => {
  const plants = await getSavedPlants();
  const plant = plants.find(p => p.id === plantId);
  return plant?.journalEntries || [];
};

/**
 * Add a new journal entry to a plant
 * @param {string} plantId - The ID of the plant
 * @param {Object} entry - The journal entry to add
 * @param {string} entry.title - Entry title
 * @param {string} entry.description - Entry description
 * @param {string} entry.type - Entry type (e.g., 'note', 'watering')
 * @param {Array} entry.images - Array of image URIs
 * @returns {Promise<Object>} The updated plant
 */
export const addJournalEntry = async (plantId, entry) => {
  console.log(`[DEBUG] plantStorage.addJournalEntry - Starting for plantId: ${plantId}`);
  console.log(`[DEBUG] plantStorage.addJournalEntry - Entry data:`, JSON.stringify(entry));
  
  try {
    const plants = await getSavedPlants();
    console.log(`[DEBUG] plantStorage.addJournalEntry - Retrieved ${plants.length} plants from storage`);
    
    const plantIndex = plants.findIndex(p => p.id === plantId);
    console.log(`[DEBUG] plantStorage.addJournalEntry - Plant index: ${plantIndex}`);
    
    if (plantIndex === -1) {
      console.error(`[ERROR] plantStorage.addJournalEntry - Plant with ID ${plantId} not found`);
      throw new Error('Plant not found');
    }
    
    // Log existing journal entries
    const existingEntries = plants[plantIndex].journalEntries || [];
    console.log(`[DEBUG] plantStorage.addJournalEntry - Existing journal entries: ${existingEntries.length}`);
    
    // Create new entry with ID and timestamp
    const newEntryId = String(Date.now());
    const newEntry = {
      ...entry,
      id: newEntryId,
      createdAt: Date.now(),
      date: entry.date || new Date().toISOString()
    };
    console.log(`[DEBUG] plantStorage.addJournalEntry - Created new entry with ID: ${newEntryId}`);
    
    const updatedPlant = {
      ...plants[plantIndex],
      journalEntries: [
        newEntry,
        ...existingEntries
      ]
    };
    
    console.log(`[DEBUG] plantStorage.addJournalEntry - Updated plant now has ${updatedPlant.journalEntries.length} journal entries`);
    
    // Update the plant in the array
    plants[plantIndex] = updatedPlant;
    
    // Save to storage
    console.log(`[DEBUG] plantStorage.addJournalEntry - Saving updated plants to storage`);
    await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
    
    console.log(`[DEBUG] plantStorage.addJournalEntry - Successfully added journal entry with ID: ${newEntryId}`);
    return updatedPlant;
  } catch (error) {
    console.error(`[ERROR] plantStorage.addJournalEntry - Failed to add journal entry:`, error);
    throw error;
  }
};

/**
 * Delete a journal entry
 * @param {string} plantId - The ID of the plant
 * @param {string} entryId - The ID of the entry to delete
 * @returns {Promise<Object>} The updated plant
 */
export const deleteJournalEntry = async (plantId, entryId) => {
  const plants = await getSavedPlants();
  const plantIndex = plants.findIndex(p => p.id === plantId);
  
  if (plantIndex === -1) {
    throw new Error('Plant not found');
  }

  const updatedPlant = {
    ...plants[plantIndex],
    journalEntries: (plants[plantIndex].journalEntries || []).filter(
      entry => entry.id !== entryId
    )
  };

  plants[plantIndex] = updatedPlant;
  await storage.setItem(SAVED_PLANTS_KEY, JSON.stringify(plants));
  return updatedPlant;
};

// Export storage for testing
export { storage as AsyncStorage };
