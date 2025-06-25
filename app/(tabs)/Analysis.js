import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { usePlantAnalysis } from '../../hooks/usePlantAnalysis';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CareInstructionsSection from '../../components/plant/CareInstructionsSection';
import ConfidenceBadge from '../../components/plant/ConfidenceBadge';
import NoteContainer from '../../components/plant/NoteContainer';
import PlantInfoSection from '../../components/plant/PlantInfoSection';
import SaveButton from '../../components/plant/SaveButton';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';
import { extractPlantInfo } from '../../utils/plantDetails';

import { getPlantInfo } from '../../utils/geminiService';

export default function AnalysisScreen() {
  const searchParams = useLocalSearchParams();
  let plantData, imageUri;
  if (searchParams && searchParams.plantData) {
    try {
      // Only parse if plantData is a string that looks like JSON
      if (typeof searchParams.plantData === 'string' && searchParams.plantData.trim().startsWith('{')) {
        const parsed = JSON.parse(searchParams.plantData);
        if (parsed && parsed.plantData) {
          plantData = parsed.plantData;
          imageUri = parsed.imageUri;
        } else {
          plantData = parsed;
          imageUri = searchParams.imageUri;
        }
      } else {
        plantData = searchParams.plantData;
        imageUri = searchParams.imageUri;
      }
    } catch {
      plantData = searchParams.plantData;
      imageUri = searchParams.imageUri;
    }
  }

  if (!plantData) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="science" size={64} color="#DDD" />
        <Text style={styles.emptyText}>No plant analysis yet</Text>
        <Text style={styles.emptySubtext}>Start a new analysis by capturing a plant image or select a saved plant from 'My Plants'.</Text>
      </View>
    );
  }

  // Local state for Gemini info, loading, error, and plant name used
  const [geminiInfo, setGeminiInfo] = useState(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(null);
  const [geminiPlantName, setGeminiPlantName] = useState('');
  const { user } = useAuth();
  const { recordAnalysis, usage } = usePlantAnalysis();

  // Helper: get top PlantNet suggestion name
  const getPlantNetTopName = () => {
    if (Array.isArray(plantData?.suggestions) && plantData.suggestions.length > 0) {
      return plantData.suggestions[0].plant_name || '';
    }
    return '';
  };




  // Fetch Gemini info on mount/plant change
  useEffect(() => {
    const fetchGemini = async () => {
      setGeminiLoading(true);
      setGeminiError(null);
      setGeminiInfo(null);
      try {
        const plantName = getPlantNetTopName();
        setGeminiPlantName(plantName);
        if (!plantName) {
          setGeminiError('Could not determine a valid plant name from PlantNet. Please try another image.');
          return;
        }
        // Record the analysis
        if (user?.id) {
          try {
            const result = await recordAnalysis(
              user.id,
              'plant_identification',
              plantName,
              plantData?.suggestions?.[0]?.probability || 0
            );
            
            // Show alert if limit reached
            if (result?.error === 'ANALYSIS_LIMIT_REACHED') {
              Alert.alert(
                'Limit Reached', 
                `You've used all your monthly analyses. ${result.message}`,
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.error('Error recording analysis:', error);
            // Only show alert for limit reached, silently log other errors
            if (error?.error === 'ANALYSIS_LIMIT_REACHED') {
              Alert.alert(
                'Limit Reached', 
                `You've used all your monthly analyses. ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }

        // Use the Gemini API with the top PlantNet suggestion
        const info = await getPlantInfo(plantName);
        if (!info || Object.keys(info).length === 0) {
          setGeminiError('No detailed plant information could be found for this analysis.');
          setGeminiInfo(null);
          return;
        }
        setGeminiInfo(info);
      } catch (err) {
        setGeminiError(err.message || 'Failed to fetch Gemini info');
        setGeminiInfo(null);
      } finally {
        setGeminiLoading(false);
      }
    };
    fetchGemini();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantData && plantData.suggestions && plantData.suggestions[0]?.plant_name]);

  // Only show plant info if we have Gemini data
  const plantInfo = geminiInfo ? extractPlantInfo(geminiInfo) : null;
  const plantId = plantInfo ? ((plantData && plantData.id) || (imageUri ? imageUri : '') + (plantInfo.scientificName || '')) : '';
  const router = useRouter();
  const { addPlant, removePlant, isPlantSaved } = useSavedPlants();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (plantInfo) {
      setSaved(isPlantSaved({ id: plantId, imageUri, scientificName: plantInfo.scientificName }));
    }
  }, [isPlantSaved, plantId, imageUri, plantInfo && plantInfo.scientificName]);

  const handleToggleSave = () => {
    if (!plantInfo) return;
    if (saved) {
      removePlant(plantId);
      Alert.alert('Removed', 'This plant has been removed from your collection.');
    } else {
      console.log('DEBUG: Saving plantData:', JSON.stringify(plantData, null, 2));
      // Extract names from the suggestions array
      let commonName = '';
      let scientificName = '';
      if (
        plantData.suggestions &&
        plantData.suggestions.length > 0 &&
        plantData.suggestions[0].plant_details
      ) {
        const details = plantData.suggestions[0].plant_details;
        commonName = Array.isArray(details.common_names) && details.common_names.length > 0
          ? details.common_names[0]
          : '';
        scientificName = details.scientific_name || '';
      }
      addPlant({
        plantData: {
          ...plantData,
          commonName,
          scientificName
        },
        imageUri: imageUri || '',
        id: plantId,
        savedAt: Date.now(),
      });
      Alert.alert('Plant Saved', 'This plant has been added to your collection!');
    }
  };

  // Debug log to check if usage data is available
  console.log('Usage data:', usage);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }} edges={['top']}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={styles.headerContainer}>
          <View style={styles.usageContainer}>
            <Text style={styles.usageLabel}>Analyses Left</Text>
            <Text style={styles.usageCount}>
              {usage?.remaining !== undefined ? usage.remaining : 'Loading...'}
            </Text>
          </View>
        </View>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : null}
        {plantInfo && (
          <View style={{ marginBottom: 12 }}>
            {/* Common Name (from Gemini, else PlantNet) */}
            <Text style={[styles.commonName, { textAlign: 'center', marginBottom: 0 }]}>
              {plantInfo.commonName || (plantData?.suggestions && plantData.suggestions[0]?.plant_details?.common_names?.[0]) || ''}
            </Text>
            {/* Scientific Name */}
            {plantInfo.scientificName ? (
              <Text style={[styles.scientificName, { textAlign: 'center' }]}>{plantInfo.scientificName}</Text>
            ) : null}
            {/* Confidence badge and Save button in same row */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
              {(plantData?.suggestions && plantData.suggestions[0]?.probability > 0) && (
                <View style={{ marginRight: 16 }}>
                  <ConfidenceBadge probability={Math.round(plantData.suggestions[0].probability * 100)} />
                </View>
              )}
              <SaveButton saved={saved} label={saved ? 'Saved' : 'Save'} onPress={handleToggleSave} />
            </View>
          </View>
        )}
        {geminiLoading && (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{ color: '#888', fontSize: 15 }}>Fetching detailed plant info...</Text>
          </View>
        )}
        {geminiError && (
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <Text style={{ color: '#D32F2F', fontSize: 14 }}>Gemini Error: {geminiError}</Text>
          </View>
        )}
        {plantInfo ? (
          <>
            <PlantInfoSection
              scientificName={plantInfo.scientificName}
              family={plantInfo.family}
              genus={plantInfo.genus}
              origin={plantInfo.origin}
              growthRate={plantInfo.growthRate}
              matureSize={plantInfo.matureSize}
              toxicity={plantInfo.toxicity}
              funFacts={plantInfo.funFacts}
              commonUses={plantInfo.commonUses}
              ecologicalRole={plantInfo.ecologicalRole}
              culturalUses={plantInfo.culturalUses}
              historicalUses={plantInfo.historicalUses}
              wikiUrl={plantInfo.wikiUrl}
            />
            <CareInstructionsSection careTips={plantInfo.careTips} careDetails={plantInfo.careDetails} />
          </>
        ) : geminiError ? (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{ color: '#D32F2F', fontSize: 15 }}>{geminiError}</Text>
          </View>
        ) : null}
        <NoteContainer />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  usageContainer: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  usageLabel: {
    fontSize: 14,
    color: '#2e7d32',
    marginRight: 6,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    minWidth: 20,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
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
