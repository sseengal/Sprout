import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';
import { useReminders } from '../../contexts/ReminderContext';

export const RemindersTab = ({ plantReminders, plantId }) => {
  const { getPlantReminders, reloadReminders } = useReminders();
  
  // Debug logging for plant reminders
  useEffect(() => {
    console.log(`[DEBUG] Plant profile reminders count: ${plantReminders?.length || 0}`);
    if (plantReminders && plantReminders.length > 0) {
      console.log('[DEBUG] First plant reminder:', JSON.stringify(plantReminders[0]));
    } else {
      console.log('[DEBUG] No plant reminders found in props, plantId:', plantId);
    }
  }, [plantReminders, plantId]);
  
  // Reload reminders when the component mounts
  useEffect(() => {
    if (plantId) {
      // Convert plantId to string for consistent comparison
      const plantIdStr = String(plantId);
      console.log('[DEBUG] RemindersTab mounted, reloading reminders for plant:', plantIdStr);
      reloadReminders()
        .then(() => {
          console.log('[DEBUG] Reminders reloaded successfully');
        })
        .catch(error => console.error('Error reloading reminders in RemindersTab:', error));
    }
  }, [plantId, reloadReminders]);
  const getReminderIcon = (careType) => {
    switch (careType) {
      case 'watering': return 'water-outline';
      case 'fertilizing': return 'bottle-tonic-outline';
      case 'pruning': return 'scissors-cutting';
      case 'repotting': return 'flower-pot-outline';
      default: return 'reminder';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Ensure plantReminders is an array
  const safeReminders = Array.isArray(plantReminders) ? plantReminders : [];
  
  return (
    <View style={styles.tabContent}>
      {safeReminders.length > 0 ? (
        <ScrollView>
          {safeReminders.map(reminder => {
            // Skip reminders without required fields
            if (!reminder || !reminder.id || !reminder.care_type) {
              return null;
            }
            
            return (
              <View key={reminder.id} style={styles.reminderItem}>
                <View style={styles.reminderIconContainer}>
                  <MaterialCommunityIcons 
                    name={getReminderIcon(reminder.care_type)} 
                    size={24} 
                    color="#2E7D32" 
                  />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>
                    {reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1)}
                  </Text>
                  <Text style={styles.reminderFrequency}>
                    Every {reminder.frequency_days} {reminder.frequency_days === 1 ? 'day' : 'days'}
                  </Text>
                  <Text style={styles.reminderNextDue}>
                    Next: {formatDate(reminder.next_due)}
                  </Text>
                </View>
              </View>
            );
          })}
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
