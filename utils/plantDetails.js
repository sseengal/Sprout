// Utility to extract and normalize plant details from API or fallback data
export function extractPlantInfo(plantData) {
  if (!plantData) return {
    commonName: '', scientificName: '', family: '', genus: '', wikiUrl: '', probability: 0, careTips: {},
    origin: '', growthRate: '', matureSize: {}, toxicity: {}, funFacts: [], commonUses: [], ecologicalRole: '', culturalUses: '', historicalUses: ''
  };

  // Prefer PlantNet suggestions if available
  let commonName = '';
  let scientificName = '';
  let probability = 0;
  
  if (Array.isArray(plantData.suggestions) && plantData.suggestions.length > 0) {
    const top = plantData.suggestions[0];
    
    // Get the first common name if available, otherwise use the scientific name as fallback
    const commonNames = top.plant_details?.common_names || [];
    commonName = commonNames.length > 0 ? commonNames[0] : '';
    
    // Get the scientific name
    scientificName = top.plant_name || 
                   (Array.isArray(top.plant_details?.scientific_name) 
                     ? top.plant_details.scientific_name[0] 
                     : (top.plant_details?.scientific_name || ''));
                     
    probability = top.probability ? Math.round(top.probability * 100) : 0;
  } else {
    // Fallback for non-suggestion data
    commonName = plantData.plant_details?.common_names?.[0] || '';
    scientificName = Array.isArray(plantData.plant_details?.scientific_name)
      ? plantData.plant_details.scientific_name[0]
      : (plantData.plant_details?.scientific_name || plantData.plant_name || '');
    probability = plantData.probability ? Math.round(plantData.probability * 100) : 0;
  }

  const plantNetFamily = plantData.plant_details?.taxonomy?.family || '';
  const plantNetGenus = plantData.plant_details?.taxonomy?.genus || '';
  const wikiUrl = plantData.plant_details?.url || null;
  const careTips = {
    watering: plantData.plant_details?.care_tips?.find(tip =>
      tip.toLowerCase().includes('water') || tip.toLowerCase().includes('moist')
    ) || 'Water when the top inch of soil is dry.',
    sunlight: plantData.plant_details?.care_tips?.find(tip =>
      tip.toLowerCase().includes('light') || tip.toLowerCase().includes('sun')
    ) || 'Prefers bright, indirect light.',
    temperature: plantData.plant_details?.care_tips?.find(tip =>
      tip.toLowerCase().includes('temperature') || tip.toLowerCase().includes('warm')
    ) || 'Prefers temperatures between 65-80°F (18-27°C).',
    ...(plantData.careTips?.length > 0 && {
      customTips: plantData.careTips
    })
  };

  // Check for Gemini API structure (PLANT_INFO_SCHEMA)
  let origin = '', growthRate = '', matureSize = {}, toxicity = {}, funFacts = [], commonUses = [], ecologicalRole = '', culturalUses = '', historicalUses = '', geminiFamily = '', geminiScientificName = '', geminiGenus = '';
  if (plantData.basicInfo) {
    origin = plantData.basicInfo.origin || '';
    growthRate = plantData.basicInfo.growthRate || '';
    matureSize = plantData.basicInfo.matureSize || {};
    toxicity = plantData.basicInfo.toxicity || {};
    geminiFamily = plantData.basicInfo.family || '';
    geminiScientificName = plantData.basicInfo.scientificName || '';
    geminiGenus = plantData.basicInfo.genus || '';
  }
  if (plantData.additionalInfo) {
    funFacts = plantData.additionalInfo.funFacts || [];
    commonUses = plantData.additionalInfo.commonUses || [];
    if (plantData.additionalInfo.ecologicalRole) ecologicalRole = plantData.additionalInfo.ecologicalRole;
    if (plantData.additionalInfo.culturalUses) culturalUses = plantData.additionalInfo.culturalUses;
    if (plantData.additionalInfo.historicalUses) historicalUses = plantData.additionalInfo.historicalUses;
  }
  // For backward compatibility, check top-level fields if not present above
  if (plantData.ecologicalRole) ecologicalRole = plantData.ecologicalRole;
  if (plantData.culturalUses) culturalUses = plantData.culturalUses;
  if (plantData.historicalUses) historicalUses = plantData.historicalUses;

  // Extract detailed care sections from Gemini (if present)
  let careDetails = null;
  if (plantData.careGuide || plantData.seasonalCare || plantData.commonIssues || plantData.propagation) {
    careDetails = {
      watering: plantData.careGuide?.watering || null,
      light: plantData.careGuide?.light || null,
      temperature: plantData.careGuide?.environment?.temperature || null,
      humidity: plantData.careGuide?.environment?.humidity || null,
      soil: plantData.careGuide?.soil || null,
      feeding: plantData.careGuide?.feeding || null,
      maintenance: plantData.careGuide?.maintenance || null,
      seasonalCare: plantData.seasonalCare || null,
      commonIssues: plantData.commonIssues || null,
      propagation: plantData.propagation || null,
    };
  }

  return {
    commonName,
    scientificName: geminiScientificName || scientificName,
    family: geminiFamily || plantNetFamily,
    genus: geminiGenus || plantNetGenus,
    wikiUrl,
    probability,
    careTips,
    careDetails, // <-- new, robust care details
    origin,
    growthRate,
    matureSize,
    toxicity,
    funFacts,
    commonUses,
    ecologicalRole,
    culturalUses,
    historicalUses
  };
}
