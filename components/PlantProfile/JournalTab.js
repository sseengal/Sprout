import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

export const JournalTab = () => {
  return (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabContent}>
        <MaterialCommunityIcons name="notebook-outline" size={64} color="#DDD" />
        <Text style={styles.emptyTabText}>Plant journal is under development</Text>
        <Text style={styles.emptyTabSubtext}>Track growth, add notes, and save photos of your plant's progress</Text>
      </View>
    </View>
  );
};
