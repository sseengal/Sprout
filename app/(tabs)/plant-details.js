import React from 'react';
import { ScrollView, Alert, Image, Text, View } from 'react-native';
import Header from '../../components/plant/Header';
import ConfidenceBadge from '../../components/plant/ConfidenceBadge';
import PlantInfoSection from '../../components/plant/PlantInfoSection';
import CareInstructionsSection from '../../components/plant/CareInstructionsSection';
import NoteContainer from '../../components/plant/NoteContainer';
import SaveButton from '../../components/plant/SaveButton';
import { extractPlantInfo } from '../../utils/plantDetails';

import { useLocalSearchParams, useRouter } from 'expo-router';

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
      <ScrollView style={{ flex: 1, backgroundColor: '#f0f7f0', padding: 16 }}>
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
    );
  }
  const plantInfo = extractPlantInfo(plantData);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f0f7f0', padding: 16 }}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#e0e0e0' }}
          resizeMode="cover"
        />
      ) : null}
      <Header
        title={plantInfo.commonName || plantInfo.scientificName || 'Plant Details'}
        onBack={() => {
          if (navigation && typeof navigation.goBack === 'function') {
            navigation.goBack();
          } else if (typeof router?.back === 'function') {
            router.back();
          }
        }}
      />
      <View style={{ marginBottom: 12, alignItems: 'center' }}>
        {plantInfo.commonName ? (
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#2E7D32' }}>{plantInfo.commonName}</Text>
        ) : null}
        {plantInfo.scientificName ? (
          <Text style={{ fontSize: 16, fontStyle: 'italic', color: '#555' }}>{plantInfo.scientificName}</Text>
        ) : null}
      </View>
      <ConfidenceBadge probability={plantInfo.probability} />
      <PlantInfoSection
        scientificName={plantInfo.scientificName}
        family={plantInfo.family}
        genus={plantInfo.genus}
        wikiUrl={plantInfo.wikiUrl}
      />
      <CareInstructionsSection careTips={plantInfo.careTips} />
      <NoteContainer />
      <SaveButton onPress={() => Alert.alert('Save Plant', 'This feature will be implemented soon!')} />
    </ScrollView>
  );
}
