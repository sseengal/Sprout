import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useReminders } from '../../contexts/ReminderContext';
import * as PlantStorage from '../../services/plantStorage';
import { plantProfileStyles as styles } from '../../styles/plantProfileStyles';

export const RemindersTab = ({ plantReminders, plantId, activeReminderId }) => {
  const { getPlantReminders, reloadReminders, completeReminder } = useReminders();
  const [highlightedReminderId, setHighlightedReminderId] = useState(activeReminderId);
  const [processingAction, setProcessingAction] = useState(false);
  const [hiddenReminderIds, setHiddenReminderIds] = useState([]);
  
  // Debug logging for plant reminders
  useEffect(() => {
    console.log(`[DEBUG] Plant profile reminders count: ${plantReminders?.length || 0}`);
    if (plantReminders && plantReminders.length > 0) {
      console.log('[DEBUG] First plant reminder:', JSON.stringify(plantReminders[0]));
    } else {
      console.log('[DEBUG] No plant reminders found in props, plantId:', plantId);
    }
    
    // Reset hidden reminders when plantReminders changes
    setHiddenReminderIds([]);
  }, [plantReminders, plantId]);
  
  // Reload reminders when the component mounts or when activeReminderId changes
  useEffect(() => {
    if (plantId) {
      // Convert plantId to string for consistent comparison
      const plantIdStr = String(plantId);
      console.log('[DEBUG] RemindersTab mounted, reloading reminders for plant:', plantIdStr);
      reloadReminders()
        .then(() => {
          console.log('[DEBUG] Reminders reloaded successfully');
          
          // If there's an active reminder ID from navigation, highlight it
          if (activeReminderId) {
            console.log(`[DEBUG] RemindersTab - Setting highlighted reminder ID: ${activeReminderId}`);
            setHighlightedReminderId(activeReminderId);
            
            // Use a small timeout to ensure the UI has rendered before scrolling
            setTimeout(() => {
              console.log(`[DEBUG] RemindersTab - Reminder ${activeReminderId} should now be highlighted`);
            }, 300);
          }
        })
        .catch(error => console.error('Error reloading reminders in RemindersTab:', error));
    }
  }, [plantId, reloadReminders, activeReminderId]);
  
  // Handle reminder action (confirm or skip)
  const handleReminderAction = async (reminder, action) => {
    console.log(`[DEBUG] RemindersTab.handleReminderAction - Starting action: ${action} for reminder:`, JSON.stringify(reminder));
    
    if (processingAction) {
      console.log('[DEBUG] RemindersTab.handleReminderAction - Already processing an action, ignoring');
      return; // Prevent multiple clicks
    }
    
    try {
      console.log('[DEBUG] RemindersTab.handleReminderAction - Setting processingAction to true');
      setProcessingAction(true);
      
      // We can't directly modify plantReminders since it's a prop
      // Instead, we'll just hide this reminder in the UI using local state
      console.log('[DEBUG] RemindersTab.handleReminderAction - Marking reminder as being processed');
      setHiddenReminderIds(prev => [...prev, reminder.id]);
      
      if (action === 'confirm') {
        console.log(`[DEBUG] RemindersTab.handleReminderAction - Confirming reminder ID: ${reminder.id}`);
        // Mark reminder as completed
        const updatedReminder = await completeReminder(reminder.id);
        console.log('[DEBUG] RemindersTab.handleReminderAction - Reminder completed:', updatedReminder ? JSON.stringify(updatedReminder) : 'No result returned');
        
        // Create a journal entry for this action
        const entryType = reminder.care_type;
        const entryDescription = `${reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1)} completed`;
        console.log(`[DEBUG] RemindersTab.handleReminderAction - Creating journal entry for plantId: ${plantId}, type: ${entryType}`);
        
        // Add journal entry
        try {
          const journalEntry = {
            type: entryType,
            description: entryDescription,
            date: new Date().toISOString(),
            images: [],
            fromReminder: true,
            reminderId: reminder.id
          };
          
          console.log('[DEBUG] RemindersTab.handleReminderAction - Journal entry to add:', JSON.stringify(journalEntry));
          const result = await PlantStorage.addJournalEntry(plantId, journalEntry);
          console.log('[DEBUG] RemindersTab.handleReminderAction - Journal entry added result:', result);
        } catch (journalError) {
          console.error('[ERROR] RemindersTab.handleReminderAction - Failed to add journal entry:', journalError);
        }
        
        console.log('[DEBUG] RemindersTab.handleReminderAction - Showing success toast');
        Toast.show({
          type: 'success',
          text1: 'Care completed',
          text2: `${reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1)} recorded in journal`,
          position: 'top',
          visibilityTime: 2000,
        });
      } else if (action === 'skip') {
        console.log(`[DEBUG] RemindersTab.handleReminderAction - Skipping reminder ID: ${reminder.id}`);
        // Just reschedule the reminder without creating a journal entry
        const updatedReminder = await completeReminder(reminder.id, true); // true indicates skipped
        console.log('[DEBUG] RemindersTab.handleReminderAction - Reminder skipped:', updatedReminder ? JSON.stringify(updatedReminder) : 'No result returned');
        
        console.log('[DEBUG] RemindersTab.handleReminderAction - Showing info toast');
        Toast.show({
          type: 'info',
          text1: 'Reminder skipped',
          text2: `Next ${reminder.care_type} reminder scheduled`,
          position: 'top',
          visibilityTime: 2000,
        });
      }
      
      // Clear the highlighted reminder
      console.log('[DEBUG] RemindersTab.handleReminderAction - Clearing highlighted reminder');
      setHighlightedReminderId(null);
      
      // Reload reminders to get updated data
      console.log('[DEBUG] RemindersTab.handleReminderAction - Reloading reminders');
      const freshReminders = await reloadReminders();
      console.log(`[DEBUG] RemindersTab.handleReminderAction - Reminders reloaded, count: ${freshReminders?.length || 0}`);
    } catch (error) {
      console.error('[ERROR] RemindersTab.handleReminderAction - Error handling reminder action:', error);
      Alert.alert('Error', 'Failed to process reminder action. Please try again.');
      
      // Reset hidden reminders and restore reminders in case of error
      console.log('[DEBUG] RemindersTab.handleReminderAction - Error occurred, resetting hidden reminders');
      setHiddenReminderIds([]);
      
      // Reload reminders
      console.log('[DEBUG] RemindersTab.handleReminderAction - Error occurred, reloading reminders');
      reloadReminders();
    } finally {
      console.log('[DEBUG] RemindersTab.handleReminderAction - Setting processingAction to false');
      setProcessingAction(false);
    }
  };
  
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

  // Check if a reminder is due or overdue
  const isReminderDue = (reminder) => {
    if (!reminder || !reminder.next_due) return false;
    
    const nextDue = new Date(reminder.next_due);
    const now = new Date();
    
    return nextDue <= now;
  };
  
  // Ensure plantReminders is an array
  const safeReminders = Array.isArray(plantReminders) ? plantReminders : [];
  
  // Filter out hidden reminders
  const visibleReminders = safeReminders.filter(reminder => 
    reminder && reminder.id && !hiddenReminderIds.includes(reminder.id)
  );
  
  // Sort reminders: due/overdue first, then by next_due date
  const sortedReminders = [...visibleReminders].sort((a, b) => {
    const aIsDue = isReminderDue(a);
    const bIsDue = isReminderDue(b);
    
    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;
    
    return new Date(a.next_due) - new Date(b.next_due);
  });
  
  // Debug logging for visible reminders
  console.log(`[DEBUG] RemindersTab - Visible reminders: ${visibleReminders.length}, Hidden: ${hiddenReminderIds.length}`);
  if (hiddenReminderIds.length > 0) {
    console.log(`[DEBUG] RemindersTab - Hidden reminder IDs:`, JSON.stringify(hiddenReminderIds));
  }
  
  return (
    <View style={styles.tabContent}>
      {sortedReminders.length > 0 ? (
        <ScrollView>
          {sortedReminders.map(reminder => {
            // Skip reminders without required fields
            if (!reminder || !reminder.id || !reminder.care_type) {
              return null;
            }
            
            const isDue = isReminderDue(reminder);
            const isHighlighted = reminder.id === highlightedReminderId;
            
            return (
              <View key={reminder.id} 
                style={[
                  styles.reminderItem, 
                  isDue && localStyles.dueReminder,
                  isHighlighted && localStyles.highlightedReminder
                ]}
              >
                <View style={styles.reminderIconContainer}>
                  <MaterialCommunityIcons 
                    name={getReminderIcon(reminder.care_type)} 
                    size={24} 
                    color={isDue ? "#D32F2F" : "#2E7D32"} 
                  />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={[styles.reminderTitle, isDue && localStyles.dueText]}>
                    {reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1)}
                    {isDue && ' (Due)'}
                  </Text>
                  <Text style={styles.reminderFrequency}>
                    Every {reminder.frequency_days} {reminder.frequency_days === 1 ? 'day' : 'days'}
                  </Text>
                  <Text style={[styles.reminderNextDue, isDue && localStyles.dueText]}>
                    {isDue ? 'Due now' : `Next: ${formatDate(reminder.next_due)}`}
                  </Text>
                  
                  {/* Action buttons for due reminders */}
                  {isDue && (
                    <View style={localStyles.actionButtons}>
                      <TouchableOpacity 
                        style={localStyles.confirmButton}
                        onPress={() => handleReminderAction(reminder, 'confirm')}
                        disabled={processingAction}
                      >
                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                        <Text style={localStyles.buttonText}>Confirm</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={localStyles.skipButton}
                        onPress={() => handleReminderAction(reminder, 'skip')}
                        disabled={processingAction}
                      >
                        <MaterialCommunityIcons name="close" size={16} color="#fff" />
                        <Text style={localStyles.buttonText}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>No reminders found for this plant.</Text>
      )}
    </View>
  );
};

// Local styles for the RemindersTab component
const localStyles = StyleSheet.create({
  dueReminder: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  highlightedReminder: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  dueText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  skipButton: {
    backgroundColor: '#757575',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
