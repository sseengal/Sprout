import React from 'react';
import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import PlantDetailsScreen from './PlantDetailsScreen';

export default function PlantDetails() {
  const params = useLocalSearchParams();
  
  // Parse the plantData if it exists
  let plantData = null;
  try {
    if (params.plantData) {
      plantData = JSON.parse(params.plantData);
    }
  } catch (error) {
    console.error('Error parsing plantData:', error);
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Plant Details',
        }}
      />
      <PlantDetailsScreen 
        plantData={plantData} 
        imageUri={params.imageUri} 
      />
    </>
  );
}
