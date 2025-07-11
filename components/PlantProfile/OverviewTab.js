import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

export const OverviewTab = ({ handleDelete }) => {
  return (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabContent}>
        <Text style={styles.emptyTabText}>Plant overview coming soon</Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={handleDelete}
      >
        <Text style={styles.deleteButtonText}>Remove Plant</Text>
      </TouchableOpacity>
    </View>
  );
};
