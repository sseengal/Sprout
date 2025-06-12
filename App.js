import { NavigationContainer } from '@react-navigation/nest';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraScreen from './src/screens/CameraScreen';
import PlantDetailsScreen from './src/screens/PlantDetailsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Camera">
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ title: 'Identify a Plant' }}
          />
          <Stack.Screen 
            name="PlantDetails" 
            component={PlantDetailsScreen} 
            options={{ title: 'Plant Care' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
