import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CareInstructionsSection from '../plant/CareInstructionsSection';
import ConfidenceBadge from '../plant/ConfidenceBadge';
import NoteContainer from '../plant/NoteContainer';
import PlantInfoSection from '../plant/PlantInfoSection';
import SaveButton from '../plant/SaveButton';

/**
 * UI component for displaying plant analysis results
 */
export default function AnalysisContent({
  imageUri,
  plantInfo,
  plantData,
  saved,
  handleToggleSave,
  geminiLoading,
  geminiError,
  // Plant.ID API related props - disabled
  // plantIdLoading,
  // plantIdError,
  // plantIdData,
  // fetchPlantHealthData,
  credits,
  isLoadingCredits
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f7f0' }} edges={['top']}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={styles.headerContainer}>
          <View style={styles.usageContainer}>
            <Text style={styles.usageLabel}>Analyses Left</Text>
            <Text style={styles.usageCount}>
              {!isLoadingCredits ? credits.total : '...'}
            </Text>
            {credits.total === 0 && (
              <Text style={styles.upgradeText}>
                Upgrade for more analyses
              </Text>
            )}
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
            
            {/* PLANT.ID Section and disease detection functionality has been disabled as requested */}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
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
    minWidth: 24,
    textAlign: 'center',
    marginLeft: 4,
  },
  upgradeText: {
    fontSize: 12,
    color: '#ff6d00',
    marginLeft: 8,
    fontWeight: '500',
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
  plantIdSection: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  plantIdContent: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  plantIdPlaceholder: {
    color: '#6c757d',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 15,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  healthStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  diseasesContainer: {
    marginTop: 8,
  },
  diseaseItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  diseaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  probabilityBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  probabilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  diseaseDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  treatmentSection: {
    marginTop: 8,
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  treatmentItem: {
    marginBottom: 8,
  },
  treatmentType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    marginBottom: 4,
  },
  treatmentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  similarImagesSection: {
    marginTop: 12,
  },
  similarImagesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  similarImagesScroll: {
    flexDirection: 'row',
  },
  similarImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  healthyMessage: {
    fontSize: 15,
    color: '#4CAF50',
    textAlign: 'center',
    padding: 16,
  },
  noDataMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    padding: 16,
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
