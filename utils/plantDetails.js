// Utility to extract and normalize plant details from API or fallback data
export function extractPlantInfo(plantData) {
  if (!plantData) return { commonName: '', scientificName: '', family: '', genus: '', wikiUrl: '', probability: 0, careTips: {} };

  // Prefer PlantNet suggestions if available
  let commonName = '';
  let scientificName = '';
  let probability = 0;
  if (Array.isArray(plantData.suggestions) && plantData.suggestions.length > 0) {
    const top = plantData.suggestions[0];
    commonName = top.plant_name || '';
    scientificName = Array.isArray(top.plant_details?.scientific_name)
      ? top.plant_details.scientific_name[0]
      : (top.plant_details?.scientific_name || '');
    probability = top.probability ? Math.round(top.probability * 100) : 0;
  } else {
    commonName = plantData.plant_name || '';
    scientificName = Array.isArray(plantData.plant_details?.scientific_name)
      ? plantData.plant_details.scientific_name[0]
      : (plantData.plant_details?.scientific_name || '');
    probability = plantData.probability ? Math.round(plantData.probability * 100) : 0;
  }

  const family = plantData.plant_details?.taxonomy?.family || '';
  const genus = plantData.plant_details?.taxonomy?.genus || '';
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

  return {
    commonName,
    scientificName,
    family,
    genus,
    wikiUrl,
    probability,
    careTips
  };
}
