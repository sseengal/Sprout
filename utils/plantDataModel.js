/**
 * Plant Data Model
 * Provides a standardized structure for plant data in the app
 */

/**
 * Creates a standardized plant data object from various sources
 * @param {Object} options - Options for creating the plant data
 * @param {Object} options.plantNetData - Data from PlantNet API (for image searches)
 * @param {Object} options.geminiData - Data from Gemini API
 * @param {string} options.imageUri - URI of the plant image
 * @param {string} options.searchType - Type of search ('image' or 'text')
 * @param {string} options.searchTerm - Original search term (for text searches)
 * @param {string} options.id - Optional ID for the plant
 * @returns {Object} Standardized plant data object
 */
export const createStandardPlantData = (options) => {
  const {
    plantNetData,
    geminiData,
    imageUri,
    searchType = 'image',
    searchTerm = '',
    id = String(Date.now())
  } = options;

  // Extract plant info from PlantNet data
  const plantNetInfo = plantNetData?.suggestions?.[0];
  const probability = plantNetInfo?.probability;
  const plantDetails = plantNetInfo?.plant_details || {};

  // Get common name from various possible sources
  const commonName = 
    geminiData?.plantInfo?.commonName ||
    plantDetails?.common_names?.[0] ||
    searchTerm ||
    'Unknown Plant';

  // Get scientific name from various possible sources
  const scientificName = 
    geminiData?.plantInfo?.scientificName ||
    plantDetails?.scientific_name ||
    '';

  return {
    // Core identification
    id,
    commonName,
    scientificName,
    
    // Taxonomy
    family: plantDetails?.family || geminiData?.plantInfo?.family || '',
    genus: plantDetails?.genus || geminiData?.plantInfo?.genus || '',
    
    // Source information
    imageUri,
    searchType,
    searchTerm,
    probability: probability || null,
    
    // Journal entries
    journalEntries: [],

    // Stored analyses (deprecated: use journalEntries with type 'analysis')
    analyses: [],
    
    // Timestamps
    savedAt: Date.now(),
    
    // Store original data for reference and backward compatibility
    plantNetData: plantNetData || null,
    geminiData: geminiData || null
  };
};

/**
 * Checks if the plant data object has the required fields
 * @param {Object} plantData - Plant data to validate
 * @returns {boolean} True if valid
 */
export const isValidPlantData = (plantData) => {
  return (
    plantData &&
    typeof plantData === 'object' &&
    (plantData.id || plantData.id === 0) &&
    typeof plantData.commonName === 'string'
  );
};

/**
 * Creates a standardized journal entry.
 * Use type 'analysis' to store an analysis result.
 * @param {string} type - Entry type (e.g., 'analysis', 'note', 'watering').
 * @param {Object} data - Arbitrary entry-specific data (analysis payload, etc.).
 * @param {Array<string>} images - Array of image URIs.
 * @param {Object} metadata - Optional metadata (title, description, etc.).
 * @returns {Object} Journal entry object ready for storage.
 */
export const createJournalEntry = (type, data = {}, images = [], metadata = {}) => ({
  id: String(Date.now() + Math.floor(Math.random() * 1000)),
  type,
  title: metadata.title || '',
  description: metadata.description || '',
  data,
  images: Array.isArray(images) ? images : [images],
  date: metadata.date || new Date().toISOString(),
  createdAt: Date.now(),
  ...metadata,
});
