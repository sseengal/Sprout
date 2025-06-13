import React from 'react';
import { Alert, Image, ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CareInstructionsSection from '../components/plant/CareInstructionsSection';
import ConfidenceBadge from '../components/plant/ConfidenceBadge';
import NoteContainer from '../components/plant/NoteContainer';
import PlantInfoSection from '../components/plant/PlantInfoSection';
import SaveButton from '../components/plant/SaveButton';
import { extractPlantInfo } from '../utils/plantDetails';
import Header from '../components/plant/Header';

import { useLocalSearchParams } from 'expo-router';

export default function PlantDetailsScreen({ route, navigation }) {
  // Support both legacy (route.params) and Expo Router v2 (search params)
  const searchParams = useLocalSearchParams();
  let plantData, imageUri;
  if (route && route.params && route.params.plantData) {
    plantData = route.params.plantData;
    imageUri = route.params.imageUri;
  } else if (searchParams && searchParams.plantData) {
    try {
      plantData = JSON.parse(searchParams.plantData);
    } catch {
      plantData = searchParams.plantData;
    }
    imageUri = searchParams.imageUri;
  }

  if (!plantData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }} edges={['top']}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Header title="Error" onBack={() => (navigation ? navigation.goBack() : null)} />
          <NoteContainer />
          <SaveButton onPress={() => {}} />
          <CareInstructionsSection careTips={[]} />
          <PlantInfoSection scientificName="" family="" genus="" wikiUrl="" />
          <ConfidenceBadge probability={0} />
          <NoteContainer />
          <SaveButton onPress={() => {}} />
          <Header title="No plant data found." />
        </ScrollView>
      </SafeAreaView>
    );
  }
  const plantInfo = extractPlantInfo(plantData);
  const router = useRouter();

  const handleIdentifyPress = () => {
    router.push('/(tabs)/camera');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }} edges={['top']}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#e0e0e0' }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ alignItems: 'center' }}>{/* Removed marginBottom as it's handled by the inner View */}
        {plantInfo.commonName ? (
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 }}>{plantInfo.commonName}</Text>
        ) : null}
        {plantInfo.scientificName ? (
          <Text style={{ fontSize: 16, fontStyle: 'italic', color: '#555', marginBottom: 12 }}>{plantInfo.scientificName}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 10 }}>{/* Increased marginBottom to 16 to match image spacing */}
          <ConfidenceBadge probability={plantInfo.probability} />
          <SaveButton onPress={() => Alert.alert('Save Plant', 'This feature will be implemented soon!')} />
        </View>
      </View>
      <PlantInfoSection
        scientificName={plantInfo.scientificName}
        family={plantInfo.family}
        genus={plantInfo.genus}
        wikiUrl={plantInfo.wikiUrl}
      />
      <CareInstructionsSection careTips={plantInfo.careTips} />
      <NoteContainer />
      
      <TouchableOpacity 
        style={styles.ctaButton}
        onPress={handleIdentifyPress}
      >
        <MaterialIcons name="camera-alt" size={24} color="white" />
        <Text style={styles.ctaButtonText}>Identify a Plant</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginTop: 20,
    marginBottom: 30,
    alignSelf: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
});
