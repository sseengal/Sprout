import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

const PlantDetails = ({ plantInfo }) => {
  useEffect(() => {
    console.log('PlantDetails plantInfo:', plantInfo);
  }, [plantInfo]);

  if (!plantInfo) {
    return null;
  }

  return (
    <View style={{ marginTop: 16 }}>
      {/* About this plant */}
      {plantInfo.basicInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>About this plant</Text>
          {typeof plantInfo.basicInfo === 'string' ? (
            <Text style={styles.description}>{plantInfo.basicInfo}</Text>
          ) : (
            <>
              {plantInfo.basicInfo.description && (
                <Text style={styles.description}>{plantInfo.basicInfo.description}</Text>
              )}
              {plantInfo.basicInfo.origin && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Origin:</Text> {plantInfo.basicInfo.origin}
                </Text>
              )}
              {plantInfo.basicInfo.growthRate && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Growth Rate:</Text> {plantInfo.basicInfo.growthRate}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Care Guide */}
      {plantInfo.careGuide && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Care Guide</Text>
          {typeof plantInfo.careGuide === 'string' ? (
            <Text style={styles.description}>{plantInfo.careGuide}</Text>
          ) : (
            <>
              {plantInfo.careGuide.watering && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Watering:</Text> {plantInfo.careGuide.watering}
                </Text>
              )}
              {plantInfo.careGuide.light && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Light:</Text> {plantInfo.careGuide.light}
                </Text>
              )}
              {plantInfo.careGuide.soil && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Soil:</Text> {plantInfo.careGuide.soil}
                </Text>
              )}
              {plantInfo.careGuide.feeding && (
                <Text style={styles.descriptionItem}>
                  <Text style={styles.bold}>Feeding:</Text> {plantInfo.careGuide.feeding}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Common Issues */}
      {plantInfo.commonIssues && (
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
    </View>
  );
};

export default PlantDetails;
