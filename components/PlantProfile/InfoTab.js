import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { extractPlantInfo } from '../../utils/plantDetails';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

export const InfoTab = ({ plant }) => {
  // Extract plant info from Gemini data if available
  const geminiData = plant.geminiData || (plant.plantData?.geminiInfo);
  
  // Extract structured plant info
  let plantInfo = null;
  if (geminiData) {
    // Check if geminiData contains the structured data or if it's nested
    if (geminiData.plantInfo) {
      plantInfo = geminiData.plantInfo;
    } else {
      plantInfo = extractPlantInfo(geminiData);
    }
  }
  
  // Get plant names from standardized model or legacy format
  const commonName = plant.commonName || (plantInfo?.commonName) || plant.plantData?.commonName || 'Unknown Plant';
  const scientificName = plant.scientificName || (plantInfo?.scientificName) || plant.plantData?.scientificName || '';
  const family = plant.taxonomy?.family || (plantInfo?.family) || '';
  const genus = plant.taxonomy?.genus || (plantInfo?.genus) || '';
  
  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Plant Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Common Name:</Text>
          <Text style={styles.infoValue}>{commonName}</Text>
        </View>
        {scientificName ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scientific Name:</Text>
            <Text style={styles.infoValue}>{scientificName}</Text>
          </View>
        ) : null}
        {family ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Family:</Text>
            <Text style={styles.infoValue}>{family}</Text>
          </View>
        ) : null}
        {genus ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Genus:</Text>
            <Text style={styles.infoValue}>{genus}</Text>
          </View>
        ) : null}
      </View>
      
      {/* Basic Info Section */}
      {plantInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>About this plant</Text>
          {typeof plantInfo.basicInfo === 'string' ? (
            <Text style={styles.description}>{plantInfo.basicInfo}</Text>
          ) : plantInfo.basicInfo ? (
            <>
              {plantInfo.basicInfo.description && (
                <Text style={styles.description}>{plantInfo.basicInfo.description}</Text>
              )}
              {plantInfo.basicInfo.origin && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Origin:</Text> {plantInfo.basicInfo.origin}</Text>
              )}
              {plantInfo.basicInfo.growthRate && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Growth Rate:</Text> {plantInfo.basicInfo.growthRate}</Text>
              )}
            </>
          ) : null}
        </View>
      )}
      
      {/* Care Guide Section */}
      {plantInfo && plantInfo.careGuide && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Care Guide</Text>
          {typeof plantInfo.careGuide === 'string' ? (
            <Text style={styles.description}>{plantInfo.careGuide}</Text>
          ) : (
            <>
              {plantInfo.careGuide.watering && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Watering:</Text> {plantInfo.careGuide.watering}</Text>
              )}
              {plantInfo.careGuide.light && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Light:</Text> {plantInfo.careGuide.light}</Text>
              )}
              {plantInfo.careGuide.soil && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Soil:</Text> {plantInfo.careGuide.soil}</Text>
              )}
              {plantInfo.careGuide.feeding && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Feeding:</Text> {plantInfo.careGuide.feeding}</Text>
              )}
            </>
          )}
        </View>
      )}
      
      {/* Common Issues Section */}
      {plantInfo && plantInfo.commonIssues && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Common Issues</Text>
          {typeof plantInfo.commonIssues === 'string' ? (
            <Text style={styles.description}>{plantInfo.commonIssues}</Text>
          ) : Array.isArray(plantInfo.commonIssues) ? (
            plantInfo.commonIssues.map((issue, index) => (
              <Text key={index} style={styles.descriptionItem}>
                • {typeof issue === 'string' ? issue : JSON.stringify(issue)}
              </Text>
            ))
          ) : (
            <Text style={styles.description}>Information about common issues is available.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};
