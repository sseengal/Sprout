/**
 * Utility for generating fun plant pet names
 */

// Arrays of adjectives and plant-related nouns for name generation
const adjectives = [
  'Happy', 'Sunny', 'Leafy', 'Green', 'Perky', 'Vibrant', 'Jolly', 'Sprightly',
  'Lush', 'Verdant', 'Blooming', 'Flourishing', 'Radiant', 'Cheerful', 'Bright',
  'Dazzling', 'Glowing', 'Thriving', 'Majestic', 'Whimsical', 'Magical', 'Dreamy',
  'Peaceful', 'Serene', 'Tranquil', 'Cozy', 'Charming', 'Lovely', 'Delightful',
  'Precious', 'Adorable', 'Cute', 'Sweet', 'Friendly', 'Gentle', 'Kind'
];

const plantNouns = [
  'Sprout', 'Leaf', 'Blossom', 'Petal', 'Stem', 'Root', 'Bud', 'Bloom',
  'Fern', 'Frond', 'Vine', 'Branch', 'Twig', 'Sapling', 'Seedling', 'Flora',
  'Garden', 'Meadow', 'Grove', 'Oasis', 'Haven', 'Sanctuary', 'Paradise',
  'Joy', 'Delight', 'Wonder', 'Treasure', 'Buddy', 'Friend', 'Pal', 'Companion'
];

/**
 * Generates a random fun pet name for a plant
 * @param {string} plantType - Optional plant type to incorporate into the name
 * @returns {string} A randomly generated pet name
 */
export const generatePlantPetName = (plantType = '') => {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = plantNouns[Math.floor(Math.random() * plantNouns.length)];
  
  // If plant type is provided, try to incorporate it sometimes
  if (plantType && Math.random() > 0.5) {
    // Clean up the plant type (remove "plant" suffix if present, etc.)
    const cleanType = plantType
      .replace(/\splant$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanType && cleanType.length > 2) {
      // Different name patterns
      const namePatterns = [
        `${randomAdjective} ${cleanType}`,
        `${cleanType} ${randomNoun}`,
        `${randomAdjective} ${cleanType} ${randomNoun}`
      ];
      
      return namePatterns[Math.floor(Math.random() * namePatterns.length)];
    }
  }
  
  // Default pattern if no plant type or random choice
  return `${randomAdjective} ${randomNoun}`;
};
