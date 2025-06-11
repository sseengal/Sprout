export default {
  expo: {
    name: 'Sprout',
    slug: 'sprout-plant-care',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'sprout',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#4CAF50'
    },
    updates: {
      fallbackToCacheTimeout: 0
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
        NSPhotoLibraryAddUsageDescription: 'Sprout needs permission to save images to your photo library.'
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
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
    web: {
      favicon: './assets/favicon.png'
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
      env: {
        PLANT_ID_API_KEY: process.env.PLANT_ID_API_KEY,
        ENABLE_LOGGING: process.env.ENABLE_LOGGING === 'true',
        LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
        APP_ENV: process.env.APP_ENV || 'development'
      }
    },
    description: 'Identify plants and get care instructions with Sprout.',
    githubUrl: 'https://github.com/yourusername/sprout-plant-app'
  }
};
