import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import PlantDetails from './PlantDetails';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';
import { extractPlantInfo } from '../../utils/plantDetails';

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
  } else {
    plantInfo = extractPlantInfo(plant.plantNetData);
  }
  
  useEffect(() => {
    console.log('InfoTab plantInfo:', plantInfo);
  }, [plantInfo]);
  
  if (!plantInfo) {
    return (
      <View style={styles.centered}>
        <Text>No plant information available</Text>
      </View>
    );
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
          {/* Check for different data structures and display accordingly */}
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
          ) : (
            <>
              {/* Check for top-level properties if basicInfo is not present */}
              {plantInfo.origin && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Origin:</Text> {plantInfo.origin}</Text>
              )}
              {plantInfo.growthRate && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Growth Rate:</Text> {plantInfo.growthRate}</Text>
              )}
              {plantInfo.funFacts && plantInfo.funFacts.length > 0 && (
                <>
                  <Text style={styles.descriptionSubtitle}>Fun Facts:</Text>
                  {plantInfo.funFacts.map((fact, index) => (
                    <Text key={index} style={styles.descriptionItem}>• {fact}</Text>
                  ))}
                </>
              )}
              {plantInfo.commonUses && plantInfo.commonUses.length > 0 && (
                <>
                  <Text style={styles.descriptionSubtitle}>Common Uses:</Text>
                  {plantInfo.commonUses.map((use, index) => (
                    <Text key={index} style={styles.descriptionItem}>• {use}</Text>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}
      
      {/* Care Guide Section */}
      {plantInfo && (plantInfo.careGuide || plantInfo.careDetails || plantInfo.careTips) && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Care Guide</Text>
          {/* Handle different data structures */}
          {typeof plantInfo.careGuide === 'string' ? (
            <Text style={styles.description}>{plantInfo.careGuide}</Text>
          ) : plantInfo.careGuide ? (
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
          ) : plantInfo.careDetails ? (
            <>
              {plantInfo.careDetails.watering && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Watering:</Text> {plantInfo.careDetails.watering.frequency || plantInfo.careDetails.watering.method}</Text>
              )}
              {plantInfo.careDetails.light && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Light:</Text> {plantInfo.careDetails.light.requirements || plantInfo.careDetails.light.idealLocation}</Text>
              )}
              {plantInfo.careDetails.soil && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Soil:</Text> {plantInfo.careDetails.soil.type}</Text>
              )}
              {plantInfo.careDetails.feeding && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Feeding:</Text> {plantInfo.careDetails.feeding.fertilizer || plantInfo.careDetails.feeding.schedule}</Text>
              )}
              {plantInfo.careDetails.humidity && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Humidity:</Text> {plantInfo.careDetails.humidity}</Text>
              )}
            </>
          ) : plantInfo.careTips ? (
            <>
              {plantInfo.careTips.watering && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Watering:</Text> {plantInfo.careTips.watering}</Text>
              )}
              {plantInfo.careTips.sunlight && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Light:</Text> {plantInfo.careTips.sunlight}</Text>
              )}
              {plantInfo.careTips.temperature && (
                <Text style={styles.descriptionItem}><Text style={styles.bold}>Temperature:</Text> {plantInfo.careTips.temperature}</Text>
              )}
            </>
          ) : null}
        </View>
      )}
      
      {/* Common Issues Section */}
      {plantInfo && plantInfo.commonIssues && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Common Issues</Text>
          {typeof plantInfo.commonIssues === 'string' ? (
            <Text style={styles.description}>{plantInfo.commonIssues}</Text>
          ) : Array.isArray(plantInfo.commonIssues) ? (
            plantInfo.commonIssues.map((issue, index) => {
              let displayText;
              if (typeof issue === 'string') {
                displayText = issue;
              } else if (issue && issue.description) {
                displayText = issue.description;
              } else {
                displayText = JSON.stringify(issue);
              }
              return (
                <Text key={index} style={styles.descriptionItem}>
                  • {displayText}
                </Text>
              );
            })
          ) : (
            <Text style={styles.description}>Information about common issues is available.</Text>
          )}
        </View>
      )}

    </ScrollView>
  );
};
