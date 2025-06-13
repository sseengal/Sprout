import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import CareInstructionsSection from '../components/plant/CareInstructionsSection';
import PlantInfoSection from '../components/plant/PlantInfoSection';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SavedPlantDetails() {
  const params = useLocalSearchParams();
  let plant = params && params.plant ? JSON.parse(params.plant) : null;

  if (!plant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888', fontSize: 18 }}>No plant data found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {plant.imageUri ? (
          <Image source={{ uri: plant.imageUri }} style={styles.image} resizeMode="cover" />
        ) : null}
        <View style={{ alignItems: 'center' }}>
          {plant.commonName ? (
            <Text style={styles.commonName}>{plant.commonName}</Text>
          ) : null}
          {plant.scientificName ? (
            <Text style={styles.scientificName}>{plant.scientificName}</Text>
          ) : null}
        </View>
        <PlantInfoSection
          scientificName={plant.scientificName}
          family={plant.family}
          genus={plant.genus}
          wikiUrl={plant.wikiUrl}
        />
        <CareInstructionsSection careTips={plant.careTips} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
  commonName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#555',
    marginBottom: 12,
  },
});
