import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

export const RemindersTab = ({ plantReminders }) => {
  const getReminderIcon = (type) => {
    switch (type) {
      case 'water': return 'water-outline';
      case 'fertilize': return 'bottle-tonic-outline';
      case 'prune': return 'scissors-cutting';
      case 'repot': return 'flower-pot-outline';
      default: return 'reminder';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.tabContent}>
      {plantReminders.length > 0 ? (
        <ScrollView>
          {plantReminders.map(reminder => (
            <View key={reminder.id} style={styles.reminderItem}>
              <View style={styles.reminderIconContainer}>
                <MaterialCommunityIcons 
                  name={getReminderIcon(reminder.type)} 
                  size={24} 
                  color="#2E7D32" 
                />
              </View>
              <View style={styles.reminderContent}>
                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                <Text style={styles.reminderFrequency}>
                  Every {reminder.frequency_days} {reminder.frequency_days === 1 ? 'day' : 'days'}
                </Text>
                <Text style={styles.reminderNextDue}>
                  Next: {formatDate(reminder.next_due)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyTabContent}>
          <MaterialCommunityIcons name="bell-outline" size={64} color="#DDD" />
          <Text style={styles.emptyTabText}>No reminders set</Text>
          <Text style={styles.emptyTabSubtext}>Add care reminders to keep your plant healthy</Text>
        </View>
      )}
    </View>
  );
};
