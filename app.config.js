// Web-focused configuration
export default {
  expo: {
    name: 'Sprout',
    owner: 'sseengal',
    slug: 'sprout-plant-care',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'sprout',
    userInterfaceStyle: 'automatic',
    jsEngine: 'hermes',
    plugins: [
      "expo-web-browser",
      "expo-router",
      "expo-font"
    ],
    
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#4CAF50'
    },
    updates: {
      url: "https://u.expo.dev/ca30723e-9d91-4e05-bdad-b5e495bfd396",
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    assetBundlePatterns: [
      '**/*'
    ],
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      // Important: This ensures the web app can handle OAuth redirects
      config: {
        dev: {
          // This ensures the development server handles all routes
          publicPath: '/'
        }
      }
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      plantIdApiKey: process.env.EXPO_PUBLIC_PLANT_ID_API_KEY,
      geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      env: {
        PLANT_ID_API_KEY: process.env.PLANT_ID_API_KEY,
        ENABLE_LOGGING: process.env.ENABLE_LOGGING === 'true',
        LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
        APP_ENV: process.env.APP_ENV || 'development',
        // Add this to help with OAuth redirects in development
        AUTH_REDIRECT_URI: process.env.NODE_ENV === 'development'
          ? 'http://localhost:8081/auth/callback'
          : 'https://your-production-url.com/auth/callback'
      },
      eas: {
        projectId: "ca30723e-9d91-4e05-bdad-b5e495bfd396"
      }
    },
    description: 'Identify plants and get care instructions with Sprout.',
    githubUrl: 'https://github.com/yourusername/sprout-plant-app'
  }
};
