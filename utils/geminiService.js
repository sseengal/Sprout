import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Initialize Gemini
const geminiApiKey = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Schema for plant information
const PLANT_INFO_SCHEMA = `{
  "basicInfo": {
    "scientificName": "Scientific name",
    "family": "Plant family",
    "origin": "Native region",
    "growthRate": "Slow/Moderate/Fast",
    "matureSize": {
      "height": "Height in cm",
      "width": "Width in cm"
    },
    "toxicity": {
      "level": "Non-toxic/Toxic",
      "affected": "Pets/Humans/Both/None",
      "symptoms": "Symptoms if ingested",
      "firstAid": "First aid measures"
    }
  },
  "careGuide": {
    "watering": {
      "frequency": "How often to water",
      "method": "How to water",
      "signs": {
        "overwatered": "Signs of overwatering",
        "underwatered": "Signs of underwatering"
      }
    },
    "light": {
      "requirements": "Light requirements",
      "tolerance": "Light tolerance",
      "idealLocation": "Ideal placement"
    },
    "environment": {
      "temperature": {
        "ideal": "Ideal temperature range",
        "minTemp": "Minimum temperature",
        "maxTemp": "Maximum temperature"
      },
      "humidity": "Humidity requirements"
    },
    "soil": {
      "type": "Soil type",
      "ph": "pH range",
      "drainage": "Drainage needs"
    },
    "feeding": {
      "fertilizer": "Fertilizer type",
      "schedule": "Feeding schedule"
    },
    "maintenance": {
      "pruning": "Pruning needs",
      "repotting": "Repotting frequency",
      "cleaning": "Leaf cleaning instructions"
    }
  },
  "seasonalCare": {
    "spring": "Spring care",
    "summer": "Summer care",
    "fall": "Fall care",
    "winter": "Winter care"
  },
  "commonIssues": [
    {
      "problem": "Problem name",
      "symptoms": "Visible symptoms",
      "solution": "How to fix",
      "prevention": "How to prevent"
    }
  ],
  "propagation": {
    "methods": ["Method 1", "Method 2"],
    "bestTime": "Best time to propagate",
    "difficulty": "Easy/Moderate/Difficult"
  },
  "additionalInfo": {
    "funFacts": ["Fact 1", "Fact 2"],
    "commonUses": ["Use 1", "Use 2"]
  }
}`;

// Cache configuration
const CACHE_CONFIG = {
  MAX_ITEMS: 50, // Maximum number of items to store in cache
  CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  STORAGE_KEY: '@PlantCare:geminiCache',
};

// In-memory cache with timestamps
export const memoryCache = new Map();
let lastCleanup = Date.now();

/**
 * Load cache from AsyncStorage
 */
const loadCache = async () => {
  try {
    const savedCache = await AsyncStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      // Only keep entries that aren't expired
      const now = Date.now();
      for (const [key, { value, timestamp }] of parsed) {
        if (now - timestamp < CACHE_CONFIG.CACHE_EXPIRY) {
          memoryCache.set(key, { value, timestamp });
        }
      }
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
};

/**
 * Save cache to AsyncStorage
 */
const saveCache = async () => {
  try {
    // Convert Map to array for storage
    const cacheToSave = Array.from(memoryCache.entries());
    await AsyncStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cacheToSave));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
};

/**
 * Clean up expired cache entries
 */
const cleanupCache = () => {
  const now = Date.now();
  let needsSave = false;
  
  // Remove expired items
  for (const [key, { timestamp }] of memoryCache.entries()) {
    if (now - timestamp > CACHE_CONFIG.CACHE_EXPIRY) {
      memoryCache.delete(key);
      needsSave = true;
    }
  }
  
  // If cache is still too big, remove oldest items
  if (memoryCache.size > CACHE_CONFIG.MAX_ITEMS) {
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    while (memoryCache.size > CACHE_CONFIG.MAX_ITEMS * 0.9) { // Keep 90% of max size
      memoryCache.delete(entries[0][0]);
      entries.shift();
      needsSave = true;
    }
  }
  
  if (needsSave) {
    saveCache();
  }
};

// Initialize cache
loadCache().then(cleanupCache);

/**
 * Get a value from cache
 */
const getFromCache = (key) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  // Check if entry is expired
  if (Date.now() - entry.timestamp > CACHE_CONFIG.CACHE_EXPIRY) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.value;
};

/**
 * Set a value in cache
 */
const setInCache = (key, value) => {
  memoryCache.set(key, {
    value,
    timestamp: Date.now(),
  });
  
  // Save to storage in the background
  saveCache();
  
  // Clean up if needed
  if (memoryCache.size >= CACHE_CONFIG.MAX_ITEMS) {
    cleanupCache();
  }
};

/**
 * Clear the entire cache
 */
export const clearGeminiCache = async () => {
  memoryCache.data.clear();
  memoryCache.lastCleanup = Date.now();
  await AsyncStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
};

/**
 * Fetches comprehensive plant information from Gemini API
 * @param {string} plantName - Common name of the plant
 * @returns {Promise<Object>} - Structured plant information
 */
export const getPlantInfo = async (plantName, promptOverride) => {
  // Check cache first
  const cacheKey = `plant-${plantName.toLowerCase().trim()}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        responseMimeType: 'application/json',
      }
    });

    const prompt = promptOverride || `You are a professional botanist. Provide comprehensive information about the ${plantName} plant in a structured JSON format.

IMPORTANT:
1. Be specific to the ${plantName} species. If unsure, note this and provide general info.
2. Include both care instructions and plant details in one response.
3. For care instructions, provide a comprehensive, actionable guide for home growers, including:
   - Watering (frequency, method, signs of overwatering and underwatering)
   - Light (requirements, tolerance, ideal placement)
   - Temperature (ideal range, min/max)
   - Humidity (requirements, tips)
   - Soil (type, pH, drainage)
   - Fertilizer (type, schedule)
   - Pruning, repotting, cleaning
   - Seasonal care (spring, summer, fall, winter)
   - Common issues (problems, symptoms, solutions, prevention)
   - Propagation (methods, best time, difficulty)
4. Present care as a detailed, step-by-step guide with bullet points and clear structure.
5. Be concise but thorough.
6. Use metric measurements by default.
7. Include interesting facts, ecological role, cultural and historical uses, and any safety concerns or toxicity.
8. If information is unavailable for a field, state 'Unknown' or leave it empty.
9. Only return valid JSON, no other text.
10. Keep responses informative but concise.
11. Use bullet points for lists in string fields.

Follow this exact JSON structure:
${PLANT_INFO_SCHEMA}`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    // Debug log raw Gemini response
    console.warn('[Gemini raw responseText]', responseText);
    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON from markdown code block if present
      const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      parsedResponse = JSON.parse(jsonString);
      // Debug log parsed Gemini response
      console.warn('[Gemini parsed response]', parsedResponse);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse plant information');
    }
    
    // Cache the parsed response
    setInCache(cacheKey, parsedResponse);
    
    return parsedResponse;
    
  } catch (error) {
    console.error('Error fetching plant info:', error);
    throw new Error(`Failed to fetch plant information: ${error.message}`);
  }
};

/**
 * Fetches comprehensive plant information
 * @param {string} plantName - Common name of the plant
 * @returns {Promise<Object>} - Comprehensive plant information
 */
export const getAllPlantInfo = async (plantName) => {
  try {
    // Get all info in a single API call
    const plantInfo = await getPlantInfo(plantName);
    return plantInfo;
  } catch (error) {
    console.error('Error getting plant info:', error);
    throw new Error(`Failed to get plant information: ${error.message}`);
  }
};
