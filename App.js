import { NavigationContainer } from '@react-navigation/nest';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraScreen from './app/(tabs)/camera';
import PlantDetailsScreen from './app/plant-details';

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
