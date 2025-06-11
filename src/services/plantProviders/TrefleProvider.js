import BaseProvider from './BaseProvider';

export default class TrefleProvider extends BaseProvider {
  constructor() {
    super();
    this.baseUrl = 'https://trefle.io/api/v1';
    this.apiKey = process.env.TREFLE_API_KEY;
  }

  /**
   * Search for plants by name
   * @param {string} query - The plant name to search for
   * @returns {Promise<Array>} - Array of matching plants
   */
  async searchPlants(query) {
    if (!query) {
      console.log('No query provided for plant search');
      return [];
    }

    if (!this.apiKey || this.apiKey === 'your_trefle_api_key_here') {
      throw new Error('Trefle API key is not configured. Please add your Trefle API key to the .env file.');
    }

    try {
      const cleanQuery = query.trim().toLowerCase();
      console.log('Searching Trefle for:', cleanQuery);
      
      // Try different search approaches
      const searchAttempts = [
        // Try exact scientific name match
        async () => {
          const url = `${this.baseUrl}/species?token=${this.apiKey}&filter[scientific_name]=${encodeURIComponent(cleanQuery)}`;
          console.log('Trying exact scientific name match:', url);
          const response = await fetch(url);
          const data = await response.json();
          return data.data || [];
        },
        
        // Try search with genus and first letter of species
        async () => {
          const parts = cleanQuery.split(' ');
          if (parts.length >= 2) {
            const partialQuery = `${parts[0]} ${parts[1].charAt(0)}`;
            const url = `${this.baseUrl}/species?token=${this.apiKey}&q=${encodeURIComponent(partialQuery)}`;
            console.log('Trying partial scientific name match:', url);
            const response = await fetch(url);
            const data = await response.json();
            return data.data || [];
          }
          return [];
        },
        
        // Try just the genus
        async () => {
          const genus = cleanQuery.split(' ')[0];
          const url = `${this.baseUrl}/genera/${genus}/species?token=${this.apiKey}`;
          console.log('Trying genus search:', url);
          try {
            const response = await fetch(url);
            const data = await response.json();
            return data.data || [];
          } catch (error) {
            console.warn('Genus search failed, trying alternative approach');
            // Fallback to regular search if genus endpoint fails
            const searchUrl = `${this.baseUrl}/species?token=${this.apiKey}&q=${encodeURIComponent(genus)}`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            return searchData.data || [];
          }
        },
        
        // Try a fuzzy search as last resort
        async () => {
          const url = `${this.baseUrl}/species/search?token=${this.apiKey}&q=${encodeURIComponent(cleanQuery)}`;
          console.log('Trying fuzzy search:', url);
          const response = await fetch(url);
          const data = await response.json();
          return data.data || [];
        }
      ];
      
      // Try each search approach until we get results
      for (const attempt of searchAttempts) {
        try {
          const results = await attempt();
          if (results && results.length > 0) {
            console.log(`Found ${results.length} results`);
            return results;
          }
        } catch (error) {
          console.warn('Search attempt failed:', error.message);
          continue;
        }
      }
      
      console.log('No matching plants found in Trefle');
      return [];
      
    } catch (error) {
      console.error('Error in searchPlants:', error);
      throw new Error('Failed to search for plants. Please try again later.');
    }
  }

  /**
   * Get detailed information about a specific plant
   * @param {string} plantId - The Trefle plant ID
   * @returns {Promise<Object>} - Plant details
   */
  async getPlantDetails(plantId) {
    if (!plantId) {
      console.log('No plant ID provided');
      return null;
    }

    try {
      // First get the species details
      const speciesUrl = `${this.baseUrl}/species/${plantId}?token=${this.apiKey}`;
      console.log('Fetching species details from:', speciesUrl);
      
      const speciesResponse = await fetch(speciesUrl);
      
      if (!speciesResponse.ok) {
        const errorText = await speciesResponse.text();
        console.error('Species API error:', errorText);
        throw new Error(`Trefle API error: ${speciesResponse.status} ${speciesResponse.statusText}`);
      }
      
      const speciesData = await speciesResponse.json();
      console.log('Species data received:', JSON.stringify({
        id: speciesData.data?.id,
        scientific_name: speciesData.data?.scientific_name,
        has_growth_data: !!speciesData.data?.growth,
        has_specifications: !!speciesData.data?.specifications,
        has_synonyms: speciesData.data?.synonyms?.length > 0,
        plant_id: speciesData.data?.plant_id
      }, null, 2));
      
      if (!speciesData.data) {
        console.log('No species data found');
        return null;
      }
      
      // Try to get additional data from the plant endpoint if available
      let plantData = null;
      if (speciesData.data.plant_id) {
        try {
          const plantUrl = `${this.baseUrl}/plants/${speciesData.data.plant_id}?token=${this.apiKey}`;
          console.log('Fetching additional plant data from:', plantUrl);
          
          const plantResponse = await fetch(plantUrl);
          
          if (!plantResponse.ok) {
            console.warn(`Plant data API error: ${plantResponse.status} ${plantResponse.statusText}`);
          } else {
            const plantResponseData = await plantResponse.json();
            plantData = plantResponseData.data;
            console.log('Additional plant data received:', JSON.stringify({
              id: plantData?.id,
              scientific_name: plantData?.scientific_name,
              has_growth_data: !!plantData?.growth,
              has_specifications: !!plantData?.specifications,
              has_common_names: plantData?.common_names?.length > 0
            }, null, 2));
          }
        } catch (error) {
          console.warn('Error fetching additional plant data:', error);
        }
      }
      
      // Try to get distribution data if available
      let distributionData = null;
      try {
        const distributionUrl = `${this.baseUrl}/species/${plantId}/distributions?token=${this.apiKey}`;
        console.log('Fetching distribution data from:', distributionUrl);
        
        const distributionResponse = await fetch(distributionUrl);
        if (distributionResponse.ok) {
          distributionData = await distributionResponse.json();
          console.log('Distribution data received:', distributionData?.data?.length ? 'Yes' : 'No');
        }
      } catch (error) {
        console.warn('Error fetching distribution data:', error);
      }
      
      // Try to get images if available
      let imagesData = null;
      try {
        const imagesUrl = `${this.baseUrl}/species/${plantId}/images?token=${this.apiKey}`;
        console.log('Fetching images from:', imagesUrl);
        
        const imagesResponse = await fetch(imagesUrl);
        if (imagesResponse.ok) {
          imagesData = await imagesResponse.json();
          console.log('Images received:', imagesData?.data?.length || 0);
        }
      } catch (error) {
        console.warn('Error fetching images:', error);
      }
      
      // Merge all the data
      const mergedData = {
        ...speciesData.data,
        ...(plantData && { plant_data: plantData }),
        ...(distributionData && { distribution: distributionData }),
        ...(imagesData && { images: imagesData })
      };
      
      // Log the structure of the merged data for debugging
      console.log('Merged plant data structure:', JSON.stringify({
        id: mergedData.id,
        scientific_name: mergedData.scientific_name,
        common_name: mergedData.common_name,
        has_growth: !!mergedData.growth,
        has_specifications: !!mergedData.specifications,
        has_plant_data: !!mergedData.plant_data,
        has_distribution: !!mergedData.distribution,
        has_images: !!(mergedData.images?.data?.length > 0),
        growth_keys: mergedData.growth ? Object.keys(mergedData.growth) : [],
        specifications_keys: mergedData.specifications ? Object.keys(mergedData.specifications) : []
      }, null, 2));
      
      // Log specific care-related fields if they exist
      if (mergedData.growth) {
        console.log('Growth data:', JSON.stringify(mergedData.growth, null, 2));
      }
      if (mergedData.specifications) {
        console.log('Specifications data:', JSON.stringify(mergedData.specifications, null, 2));
      }
      
      return mergedData;
      
    } catch (error) {
      console.error('Error in getPlantDetails:', error);
      throw new Error('Failed to fetch plant details. Please try again later.');
    }
  }

  /**
   * Find the best matching plant from search results
   * @param {Array} plants - Array of plant search results
   * @param {string} searchTerm - Original search query
   * @returns {Object|null} - Best matching plant or null
   */
  findBestMatch(plants, searchTerm) {
    if (!plants || plants.length === 0) return null;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const searchWords = searchLower.split(/\s+/);
    const searchGenus = searchWords[0];
    
    // If we only have one word, it's probably a genus
    const isGenusOnly = searchWords.length === 1;
    
    // Score each plant based on how well it matches the search term
    const scoredPlants = plants.map(plant => {
      if (!plant.scientific_name) return { ...plant, _matchScore: 0 };
      
      let score = 0;
      const sciName = plant.scientific_name.toLowerCase();
      const commonName = (plant.common_name || '').toLowerCase();
      const plantWords = sciName.split(/\s+/);
      const plantGenus = plantWords[0];
      
      // Exact match in scientific name (highest priority)
      if (sciName === searchLower) {
        score += 200;
      }
      
      // Match on genus and species (case-insensitive)
      if (searchWords.length >= 2 && plantWords.length >= 2) {
        if (plantWords[0] === searchWords[0] && plantWords[1] === searchWords[1]) {
          score += 150;
        }
      }
      
      // Match on genus (only if we're searching for a genus or the genus matches)
      if (isGenusOnly || plantGenus === searchGenus) {
        score += 50;
      }
      
      // Contains all search words in scientific name
      if (searchWords.every(word => sciName.includes(word))) {
        score += 40;
      }
      
      // Exact match in common name
      if (commonName && commonName === searchLower) {
        score += 60; // Higher weight for exact common name match
      }
      
      // Contains search term in common name
      if (commonName && commonName.includes(searchLower)) {
        score += 25;
      }
      
      // Check for partial matches in scientific name
      if (!isGenusOnly && searchWords.length > 1) {
        const allWordsMatch = searchWords.every(word => 
          sciName.includes(word) || 
          (plant.common_name && plant.common_name.toLowerCase().includes(word))
        );
        if (allWordsMatch) {
          score += 30;
        }
      }
      
      // Bonus for having an image
      if (plant.image_url) score += 20;
      
      // Bonus for accepted status
      if (plant.status === 'accepted') score += 15;
      
      // Penalize non-matching genera if we have a specific search
      if (!isGenusOnly && plantGenus !== searchGenus) {
        score -= 50;
      }
      
      return { ...plant, _matchScore: Math.max(0, score) }; // Ensure score doesn't go below 0
    });
    
    // Sort by score descending, then by scientific name
    scoredPlants.sort((a, b) => {
      // First by score (descending)
      if (b._matchScore !== a._matchScore) {
        return b._matchScore - a._matchScore;
      }
      // Then by whether it has an image (images first)
      if (!!b.image_url !== !!a.image_url) {
        return b.image_url ? 1 : -1;
      }
      // Then by scientific name (alphabetical)
      return (a.scientific_name || '').localeCompare(b.scientific_name || '');
    });
    
    // Log top 5 matches for debugging
    const topMatches = scoredPlants.slice(0, 5).map(p => ({
      name: p.scientific_name,
      common: p.common_name,
      score: p._matchScore,
      image: !!p.image_url,
      status: p.status,
      id: p.id,
      genus: p.scientific_name ? p.scientific_name.split(' ')[0] : ''
    }));
    
    console.log('Top matches:', JSON.stringify(topMatches, null, 2));
    
    // If we have multiple matches with the same genus as the search term, prefer those
    const sameGenusMatches = scoredPlants.filter(p => {
      const plantGenus = p.scientific_name ? p.scientific_name.split(' ')[0].toLowerCase() : '';
      return plantGenus === searchGenus;
    });
    
    const bestMatches = sameGenusMatches.length > 0 ? sameGenusMatches : scoredPlants;
    const bestMatch = bestMatches[0];
    
    // Adjust minimum score based on search specificity
    const minScore = isGenusOnly ? 30 : 50;
    
    if (bestMatch?._matchScore >= minScore) {
      console.log(`Selected best match: ${bestMatch.scientific_name} (score: ${bestMatch._matchScore})`);
      return bestMatch;
    }
    
    console.log('No good matches found');
    return null;
  }

  /**
   * Format plant data for our app
   * @param {Object} plantData - Raw plant data from Trefle
   * @returns {Object} - Formatted plant data
   */
  formatPlantData(plantData) {
    if (!plantData) {
      console.log('No plant data to format');
      return null;
    }

    console.log('Formatting plant data:', {
      id: plantData.id,
      name: plantData.scientific_name,
      common: plantData.common_name
    });

    // Helper function to clean and format text
    const formatText = (text) => {
      if (!text) return null;
      // Convert to string, trim, and capitalize first letter
      return String(text).trim()
        .replace(/^[a-z]/, (match) => match.toUpperCase())
        .replace(/\.$/, ''); // Remove trailing period if present
    };

    // Helper to create a readable string from an object
    const formatObject = (obj) => {
      if (!obj) return null;
      return Object.entries(obj)
        .map(([key, value]) => {
          if (value === true) return key.replace(/_/g, ' ');
          if (value === false || value === null || value === undefined) return null;
          return `${key.replace(/_/g, ' ')}: ${value}`;
        })
        .filter(Boolean)
        .join(', ');
    };

    // Extract basic info
    const formattedData = {
      id: plantData.id,
      scientificName: formatText(plantData.scientific_name) || 'Unknown',
      commonName: formatText(plantData.common_name) || 'No common name',
      family: formatText(plantData.family) || 'Family not specified',
      familyCommonName: formatText(plantData.family_common_name),
      imageUrl: plantData.image_url || null,
      year: plantData.year || null,
      status: formatText(plantData.status) || 'unknown',
      author: formatText(plantData.author),
      bibliography: formatText(plantData.bibliography),
      slug: plantData.slug || null,
      trefleUrl: plantData.links?.self ? `https://trefle.io${plantData.links.self}` : null,
      
      // Structured data
      careTips: [],
      taxonomy: {},
      growth: {},
      specifications: {},
      sources: []
    };

    // Add taxonomy
    if (plantData.genus || plantData.family) {
      formattedData.taxonomy = {
        genus: formatText(plantData.genus),
        family: formatText(plantData.family),
        familyCommonName: formatText(plantData.family_common_name),
        scientificName: formatText(plantData.scientific_name),
        commonName: formatText(plantData.common_name),
        rank: formatText(plantData.rank)
      };
    }

    // Add growth information
    if (plantData.growth) {
      formattedData.growth = {
        description: formatText(plantData.growth.description),
        sowing: formatText(plantData.growth.sowing),
        daysToHarvest: plantData.growth.days_to_harvest,
        rowSpacing: plantData.growth.row_spacing,
        spread: plantData.growth.spread,
        growthRate: formatText(plantData.growth.growth_rate),
        droughtTolerance: formatText(plantData.growth.drought_tolerance),
        frostTolerance: formatText(plantData.growth.frost_tolerance),
        shadeTolerance: formatText(plantData.growth.shade_tolerance),
        temperatureMinimum: plantData.growth.temperature_minimum,
        phMinimum: plantData.growth.ph_minimum,
        phMaximum: plantData.growth.ph_maximum,
        light: formatText(plantData.growth.light),
        atmosphericHumidity: formatText(plantData.growth.atmospheric_humidity),
        growthMonths: plantData.growth.growth_months?.join(', '),
        bloomMonths: plantData.growth.bloom_months?.join(', '),
        fruitMonths: plantData.growth.fruit_months?.join(', ')
      };
      
      // Add growth info to care tips
      if (plantData.growth.light) {
        formattedData.careTips.push(`Light: ${formatText(plantData.growth.light)}`);
      }
      if (plantData.growth.water) {
        formattedData.careTips.push(`Water: ${formatText(plantData.growth.water)}`);
      }
      if (plantData.growth.soil) {
        formattedData.careTips.push(`Soil: ${formatText(plantData.growth.soil)}`);
      }
    }

    // Add specifications
    if (plantData.specifications) {
      formattedData.specifications = {
        growthHabit: formatText(plantData.specifications.growth_habit),
        growthForm: formatText(plantData.specifications.growth_form),
        growthRate: formatText(plantData.specifications.growth_rate),
        averageHeight: plantData.specifications.average_height,
        maximumHeight: plantData.specifications.maximum_height,
        nitrogenFixation: formatText(plantData.specifications.nitrogen_fixation),
        shapeAndOrientation: formatText(plantData.specifications.shape_and_orientation),
        toxicity: formatText(plantData.specifications.toxicity)
      };
      
      // Add toxicity warning if applicable
      if (plantData.specifications.toxicity) {
        formattedData.careTips.push(`⚠️ Warning: ${formatText(plantData.specifications.toxicity)}`);
      }
    }

    // Add sources
    if (plantData.sources) {
      formattedData.sources = plantData.sources.map(source => ({
        name: formatText(source.name),
        url: source.url || null,
        citation: formatText(source.citation),
        lastUpdate: source.last_update
      }));
    }

    // Add any additional data from the plant endpoint
    if (plantData.data) {
      formattedData.additionalData = plantData.data;
    }

    // Ensure careTips is never null
    if (formattedData.careTips.length === 0) {
      formattedData.careTips.push('No specific care information available. General care recommendations may apply.');
    }

    // Add a source citation if available
    if (formattedData.bibliography) {
      formattedData.careTips.push(`Source: ${formattedData.bibliography}`);
    }

    console.log('Formatted plant data:', formattedData);
    return formattedData;
  }

  /**
   * Extract care information from Trefle plant data
   * @param {Object} plantData - Raw plant data from Trefle
   * @returns {Object} - Extracted care information
   */
  extractCareInfo(plantData) {
    if (!plantData) return {};

    // Trefle's data structure for care information
    const growth = plantData.growth || {};
    const specifications = plantData.specifications || {};
    
    return {
      // Basic care
      light: growth.light_requirements?.join(', ') || 'Not specified',
      water: this.getWateringInfo(growth), // Custom method to determine watering needs
      humidity: growth.humidity || 'Not specified',
      temperature: this.getTemperatureInfo(growth), // Custom method for temperature range
      
      // Growth characteristics
      growthHabit: growth.growth_habit || 'Not specified',
      growthRate: growth.growth_rate || 'Not specified',
      
      // Plant specifications
      lifespan: specifications.lifespan || 'Not specified',
      toxicity: specifications.toxicity || 'Not specified',
      
      // Additional care notes
      notes: this.generateCareNotes(plantData)
    };
  }

  /**
   * Generate human-readable watering information
   */
  getWateringInfo(growth) {
    if (!growth) return 'Not specified';
    
    const water = growth.watering || '';
    const frequency = growth.watering_frequency || '';
    
    if (water && frequency) {
      return `${water} (${frequency})`;
    }
    return water || frequency || 'Not specified';
  }

  /**
   * Generate temperature range information
   */
  getTemperatureInfo(growth) {
    if (!growth) return 'Not specified';
    
    const minTemp = growth.minimum_temperature?.deg_c;
    const maxTemp = growth.maximum_temperature?.deg_c;
    
    if (minTemp !== undefined && maxTemp !== undefined) {
      return `${minTemp}°C - ${maxTemp}°C`;
    } else if (minTemp !== undefined) {
      return `Above ${minTemp}°C`;
    } else if (maxTemp !== undefined) {
      return `Below ${maxTemp}°C`;
    }
    
    return 'Not specified';
  }

  /**
   * Generate additional care notes based on available data
   */
  generateCareNotes(plantData) {
    const notes = [];
    const growth = plantData.growth || {};
    const specifications = plantData.specifications || {};
    
    // Add soil preferences
    if (growth.soil_texture) {
      notes.push(`Prefers ${growth.soil_texture.join(', ')} soil.`);
    }
    
    // Add propagation methods
    if (growth.propagation_methods?.length > 0) {
      notes.push(`Can be propagated by ${growth.propagation_methods.join(', ')}.`);
    }
    
    // Add flowering information if available
    if (growth.bloom_period) {
      notes.push(`Blooms in ${growth.bloom_period}.`);
    }
    
    // Add toxicity warning if applicable
    if (specifications.toxicity) {
      notes.push(`Note: ${specifications.toxicity}.`);
    }
    
    return notes.length > 0 ? notes.join(' ') : 'No additional care notes available.';
  }
}
