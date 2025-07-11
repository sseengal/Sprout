/**
 * Utility functions for formatting plant data consistently across the app
 */

/**
 * Format plant details from raw plant data
 * @param {Object} plantData - Raw plant data object
 * @returns {Object} - Formatted plant details
 */
export const formatPlantDetails = (plantData) => {
  if (!plantData) return {};
  
  return {
    scientificName: plantData.scientificName || '',
    family: plantData.family || '',
    genus: plantData.genus || '',
    origin: plantData.origin || '',
    growthRate: plantData.growthRate || '',
    matureSize: plantData.matureSize || {},
    toxicity: plantData.toxicity || {},
    funFacts: Array.isArray(plantData.funFacts) ? plantData.funFacts : [],
    commonUses: Array.isArray(plantData.commonUses) ? plantData.commonUses : [],
    ecologicalRole: plantData.ecologicalRole || '',
    culturalUses: plantData.culturalUses || '',
    historicalUses: plantData.historicalUses || '',
    wikiUrl: plantData.wikiUrl || ''
  };
};

/**
 * Format care instructions from gemini info
 * @param {Object} careInstructions - Raw care instructions from gemini
 * @returns {Object} - Formatted care instructions with details and tips
 */
export const formatCareInstructions = (careInstructions) => {
  if (!careInstructions) return { details: {}, tips: [] };
  
  // Handle different possible structures
  let details = {};
  let tips = [];
  
  if (typeof careInstructions === 'object') {
    // Extract details
    if (careInstructions.details) {
      details = careInstructions.details;
    } else {
      // Try to extract common care details
      const possibleDetails = [
        'watering', 'light', 'temperature', 'humidity', 'soil',
        'feeding', 'maintenance', 'seasonalCare', 'commonIssues', 'propagation'
      ];
      
      possibleDetails.forEach(key => {
        if (careInstructions[key]) {
          details[key] = careInstructions[key];
        }
      });
    }
    
    // Extract tips
    if (Array.isArray(careInstructions.tips)) {
      tips = careInstructions.tips;
    } else if (careInstructions.tips && typeof careInstructions.tips === 'string') {
      tips = [careInstructions.tips];
    }
  }
  
  return { details, tips };
};

/**
 * Format additional information from gemini info
 * @param {any} additionalInfo - Raw additional info which could be string, object, or array
 * @returns {string} - Formatted additional info as a string
 */
export const formatAdditionalInfo = (additionalInfo) => {
  if (!additionalInfo) return '';
  
  if (typeof additionalInfo === 'string') {
    return additionalInfo;
  }
  
  if (Array.isArray(additionalInfo)) {
    return additionalInfo.map(item => {
      if (typeof item === 'string') return item;
      return JSON.stringify(item);
    }).join('\n\n');
  }
  
  if (typeof additionalInfo === 'object') {
    // If it's an object with specific fields we know about
    if (additionalInfo.funFacts || additionalInfo.commonUses) {
      let formattedInfo = '';
      
      if (additionalInfo.funFacts) {
        formattedInfo += '🌿 Fun Facts:\n';
        const facts = Array.isArray(additionalInfo.funFacts) 
          ? additionalInfo.funFacts 
          : [additionalInfo.funFacts];
        
        formattedInfo += facts.map(fact => `• ${fact}`).join('\n');
        formattedInfo += '\n\n';
      }
      
      if (additionalInfo.commonUses) {
        formattedInfo += '🌱 Common Uses:\n';
        const uses = Array.isArray(additionalInfo.commonUses) 
          ? additionalInfo.commonUses 
          : [additionalInfo.commonUses];
        
        formattedInfo += uses.map(use => `• ${use}`).join('\n');
      }
      
      return formattedInfo;
    }
    
    // Generic object formatting
    try {
      return Object.entries(additionalInfo)
        .map(([key, value]) => {
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          
          if (Array.isArray(value)) {
            return `${formattedKey}:\n${value.map(item => `• ${item}`).join('\n')}`;
          }
          
          if (typeof value === 'object' && value !== null) {
            return `${formattedKey}:\n${JSON.stringify(value, null, 2)}`;
          }
          
          return `${formattedKey}: ${value}`;
        })
        .join('\n\n');
    } catch (e) {
      return JSON.stringify(additionalInfo, null, 2);
    }
  }
  
  // Fallback
  return String(additionalInfo);
};

/**
 * Extract and format all plant data for display
 * @param {Object} plant - Complete plant object
 * @returns {Object} - Formatted plant data ready for display
 */
export const getFormattedPlantData = (plant) => {
  if (!plant || !plant.plantData) {
    return {
      details: {},
      careInstructions: { details: {}, tips: [] },
      additionalInfo: ''
    };
  }
  
  const plantData = plant.plantData;
  const geminiInfo = plantData.geminiInfo || {};
  
  return {
    details: formatPlantDetails(plantData),
    careInstructions: formatCareInstructions(geminiInfo.careInstructions),
    additionalInfo: formatAdditionalInfo(geminiInfo.additionalInfo)
  };
};
