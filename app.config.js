// Force Expo Go mode and fix URL issues
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
    // Ensure Expo Go compatibility
    jsEngine: 'hermes',
    // Disable dev client
    plugins: [
      "expo-web-browser",
      "expo-router"
    ],
    
    // splash image removed due to missing asset
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
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourusername.sprout',
      buildNumber: '1.0.0',
      infoPlist: {
        NSCameraUsageDescription: 'Sprout needs access to your camera to identify plants.',
        NSPhotoLibraryUsageDescription: 'Sprout needs access to your photo library to select plant images.',
        NSPhotoLibraryAddUsageDescription: 'Sprout needs permission to save images to your photo library.',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['sprout'],
            CFBundleURLName: 'com.yourusername.sprout'
          }
        ],
        LSApplicationQueriesSchemes: ['sprout']
      }
    },
    android: {
      adaptiveIcon: {
        // foregroundImage removed due to missing asset
        backgroundColor: '#4CAF50'
      },
      package: 'com.yourusername.sprout',
      versionCode: 1,
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES'
      ]
    },
    // favicon removed due to missing asset
    web: {
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you select plant images.',
          cameraPermission: 'The app accesses your camera to take photos of plants.'
        }
      ]
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      env: {
        PLANT_ID_API_KEY: process.env.PLANT_ID_API_KEY,
        ENABLE_LOGGING: process.env.ENABLE_LOGGING === 'true',
        LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
        APP_ENV: process.env.APP_ENV || 'development'
      },
      eas: {
        projectId: "ca30723e-9d91-4e05-bdad-b5e495bfd396"
      }
    },
    description: 'Identify plants and get care instructions with Sprout.',
    githubUrl: 'https://github.com/yourusername/sprout-plant-app'
  }
};
