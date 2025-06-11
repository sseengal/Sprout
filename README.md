# 🌱 Sprout - Plant Care App

Sprout is a mobile application that helps users identify plants and get personalized care instructions. Simply take a photo of a plant, and Sprout will identify it and provide you with detailed care instructions.

## Features

- 🌿 Real-time plant identification using your device's camera
- 📸 Upload photos from your gallery
- 📝 Detailed plant information and care instructions
- 🌞 Sunlight, watering, and temperature requirements
- 💾 Save your favorite plants for quick reference
- 🌎 Wikipedia integration for more information

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A physical device with the [Expo Go](https://expo.dev/client) app installed or an emulator/simulator

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/sprout-plant-app.git
   cd sprout-plant-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory and add your Plant.id API key:

   ```env
   PLANT_ID_API_KEY=your_plant_id_api_key_here
   ```

   Get your API key from [Plant.id](https://web.plant.id/).

4. **Start the development server**

   ```bash
   npx expo start
   ```

5. **Run the app**

   - **On a physical device**:
     1. Install the Expo Go app on your iOS or Android device
     2. Scan the QR code shown in the terminal or in the browser with your device's camera
     
   - **On an emulator/simulator**:
     - Press `i` for iOS simulator
     - Press `a` for Android emulator

## Project Structure

```
sprout/
├── assets/                # Images, fonts, and other static files
├── src/
│   ├── components/       # Reusable UI components
│   ├── config/            # App configuration and constants
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # App screens
│   ├── services/          # API and business logic
│   └── utils/             # Helper functions
├── App.js                 # Main application component
└── app.json              # Expo configuration
```

## Dependencies

- [Expo](https://expo.dev/) - Framework for building cross-platform mobile apps
- [React Navigation](https://reactnavigation.org/) - Routing and navigation
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/) - Access device camera
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) - Select images from device gallery
- [Axios](https://axios-http.com/) - HTTP client for API requests
- [React Native Paper](https://callstack.github.io/react-native-paper/) - Material Design components

## API Used

- [Plant.id](https://web.plant.id/) - Plant identification API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Expo](https://expo.dev/) for the amazing development experience
- [Plant.id](https://web.plant.id/) for the plant identification API
- All the open-source libraries used in this project
