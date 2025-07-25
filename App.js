import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SavedPlantsProvider } from './contexts/SavedPlantsContext';
import CameraScreen from './app/(tabs)/camera';
import PlantDetailsScreen from './app/plant-details';

const Stack = createStackNavigator();

const RootNavigator = () => (
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
);

export default function App() {
  return (
    <SavedPlantsProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </SavedPlantsProvider>
  );
}
