// API Configuration
export const API_CONFIG = {
  PLANT_ID: {
    API_KEY: 'YOUR_PLANT_ID_API_KEY', // Get from https://web.plant.id/
    API_URL: 'https://api.plant.id/v2/identify',
  },
  // Add other API configurations here
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Sprout',
  VERSION: '1.0.0',
  ENVIRONMENT: __DEV__ ? 'development' : 'production',
  // Add other app configurations here
};

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#4CAF50',
    PRIMARY_DARK: '#388E3C',
    PRIMARY_LIGHT: '#C8E6C9',
    ACCENT: '#8BC34A',
    TEXT_PRIMARY: '#212121',
    TEXT_SECONDARY: '#757575',
    DIVIDER: '#BDBDBD',
    BACKGROUND: '#F5F5F5',
    CARD: '#FFFFFF',
    ERROR: '#F44336',
    WARNING: '#FFC107',
    SUCCESS: '#4CAF50',
    INFO: '#2196F3',
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    ROUNDED: 25,
  },
  FONT_SIZE: {
    XS: 10,
    SM: 12,
    MD: 14,
    LG: 16,
    XL: 18,
    XXL: 24,
    XXXL: 32,
  },
  ELEVATION: {
    SM: 2,
    MD: 4,
    LG: 8,
  },
};

// Default values
export const DEFAULTS = {
  PLANT: {
    NAME: 'Unknown Plant',
    SCIENTIFIC_NAME: 'Not available',
    IMAGE: 'https://via.placeholder.com/300x300?text=Plant+Image',
    CARE_TIPS: {
      watering: 'Water when the top inch of soil feels dry to the touch.',
      sunlight: 'Prefers bright, indirect light.',
      temperature: 'Thrives in temperatures between 65-80°F (18-27°C).',
      humidity: 'Prefers moderate to high humidity.',
      fertilizer: 'Feed monthly during growing season with a balanced fertilizer.',
    },
  },
};
