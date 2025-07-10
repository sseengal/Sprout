import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReminderId, calculateNextDueDate } from '../utils/reminderUtils';
import * as NotificationService from '../services/notificationService';
import Toast from 'react-native-toast-message';

// Storage key for reminders
const STORAGE_KEY = 'SPROUT_CARE_REMINDERS';

// Create context
const ReminderContext = createContext();

/**
 * Provider component for reminder management
 */
export function ReminderProvider({ children }) {
  const [reminders, setReminders] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [savedPlants, setSavedPlants] = useState([]);
  const deletedReminderRef = useRef(null);
  const notificationSubscriptions = useRef(null);

  // Load reminders from AsyncStorage on mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const storedReminders = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedReminders) {
          setReminders(JSON.parse(storedReminders));
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadReminders();
    
    // Check notification permissions
    NotificationService.checkNotificationPermissions()
      .then(hasPermission => setNotificationPermission(hasPermission))
      .catch(error => console.error('Error checking notification permissions:', error));
      
    // Set up notification listeners
    notificationSubscriptions.current = NotificationService.setNotificationListeners(
      // When notification is received
      (notification) => {
        console.log('Notification received:', notification);
      },
      // When user interacts with notification
      (response) => {
        const reminderId = response.notification.request.content.data?.reminderId;
        if (reminderId) {
          console.log(`User tapped on notification for reminder: ${reminderId}`);
          // Here you could navigate to the reminder details or mark it as completed
        }
      }
    );
    
    // Clean up listeners on unmount
    return () => {
      if (notificationSubscriptions.current) {
        NotificationService.removeNotificationListeners(notificationSubscriptions.current);
      }
    };
  }, []);

  // Save reminders to AsyncStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
        .catch(error => console.error('Error saving reminders:', error));
        
      // Schedule notifications for all active reminders
      NotificationService.scheduleAllReminders(reminders)
        .catch(error => console.error('Error scheduling notifications:', error));
    }
  }, [reminders, isLoaded]);
  
  // Load saved plants and keep them in sync
  useEffect(() => {
    const loadSavedPlants = async () => {
      try {
        const data = await AsyncStorage.getItem('SPROUT_SAVED_PLANTS');
        if (data) {
          setSavedPlants(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading saved plants in ReminderContext:', error);
      }
    };
    
    loadSavedPlants();
    
    // Set up listener for saved plants changes
    const savedPlantsListener = async () => {
      try {
        const data = await AsyncStorage.getItem('SPROUT_SAVED_PLANTS');
        if (data) {
          setSavedPlants(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error in saved plants listener:', error);
      }
    };
    
    // Listen for storage changes (this works in Expo Go)
    const interval = setInterval(savedPlantsListener, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Clean up reminders for deleted plants
  useEffect(() => {
    // Only run if both reminders and plants are loaded
    if (isLoaded && savedPlants.length > 0 && reminders.length > 0) {
      // Create a set of saved plant IDs for faster lookup
      const savedPlantIds = new Set(savedPlants.map(plant => plant.id));
      
      // Find reminders for plants that no longer exist
      const remindersToDelete = reminders.filter(reminder => 
        reminder.plant_id && !savedPlantIds.has(reminder.plant_id)
      );
      
      // Delete reminders for plants that no longer exist
      if (remindersToDelete.length > 0) {
        console.log(`Removing ${remindersToDelete.length} reminders for deleted plants`);
        // Use a timeout to avoid state update conflicts
        setTimeout(() => {
          remindersToDelete.forEach(reminder => {
            // Use internal removal to avoid toast notifications for cleanup
            setReminders(prev => prev.filter(r => r.id !== reminder.id));
            // Cancel any notifications
            NotificationService.cancelNotification(reminder.id)
              .catch(error => console.error(`Error cancelling notification for reminder ${reminder.id}:`, error));
          });
        }, 0);
      }
    }
  }, [savedPlants, reminders, isLoaded]);

  /**
   * Add a new reminder
   */
  const addReminder = useCallback(async (reminder) => {
    const newReminder = {
      id: generateReminderId(),
      created_at: new Date().toISOString(),
      ...reminder
    };

    setReminders(prev => [...prev, newReminder]);
    
    // Schedule notification for the new reminder
    if (newReminder.enabled !== false) {
      try {
        await NotificationService.scheduleReminderNotification(newReminder);
      } catch (error) {
        console.error('Error scheduling notification for new reminder:', error);
      }
    }
    
    return newReminder;
  }, []);

  /**
   * Update an existing reminder
   */
  const updateReminder = useCallback(async (id, updates) => {
    let updatedReminder = null;
    
    setReminders(prev => {
      const newReminders = prev.map(reminder => {
        if (reminder.id === id) {
          updatedReminder = { ...reminder, ...updates };
          return updatedReminder;
        }
        return reminder;
      });
      return newReminders;
    });
    
    // If we found and updated the reminder, update its notification
    if (updatedReminder) {
      try {
        // Cancel the old notification
        await NotificationService.cancelNotification(id);
        
        // Schedule a new notification if the reminder is enabled
        if (updatedReminder.enabled !== false) {
          await NotificationService.scheduleReminderNotification(updatedReminder);
        }
      } catch (error) {
        console.error('Error updating notification for reminder:', error);
      }
    }
  }, []);

  /**
   * Delete a reminder
   */
  const deleteReminder = useCallback(async (id) => {
    // Find the reminder to be deleted
    const reminderToDelete = reminders.find(reminder => reminder.id === id);
    if (!reminderToDelete) return;
    
    // Store the deleted reminder in the ref for potential undo
    deletedReminderRef.current = JSON.parse(JSON.stringify(reminderToDelete));
    
    // First cancel any scheduled notification for this reminder
    try {
      await NotificationService.cancelNotification(id);
    } catch (error) {
      console.error('Error cancelling notification for deleted reminder:', error);
    }
    
    // Then remove the reminder from state
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
    
    // Show toast with undo option
    Toast.show({
      type: 'info',
      text1: `${reminderToDelete.care_type.charAt(0).toUpperCase() + reminderToDelete.care_type.slice(1)} reminder deleted`,
      text2: reminderToDelete.plant_name,
      position: 'bottom',
      visibilityTime: 4000,
      autoHide: true,
      props: {
        onUndo: undoDeleteReminder
      }
    });
  }, [reminders]);
  
  /**
   * Restore the last deleted reminder
   */
  const undoDeleteReminder = useCallback(() => {
    // Get the deleted reminder from the ref
    const reminderToRestore = deletedReminderRef.current;
    
    if (!reminderToRestore) {
      console.log('No deleted reminder to restore');
      return;
    }
    
    console.log('Restoring reminder:', reminderToRestore.id);
    
    // Add the reminder back to the list
    setReminders(prev => [...prev, reminderToRestore]);
    
    // Reschedule notification if the reminder was enabled
    if (reminderToRestore.enabled) {
      NotificationService.scheduleReminderNotification(reminderToRestore)
        .catch(error => console.error('Error rescheduling notification after undo:', error));
    }
    
    // Clear the deleted reminder ref
    deletedReminderRef.current = null;
    
    // Hide the current toast
    Toast.hide();
    
    // Show confirmation toast
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: 'Reminder restored',
        position: 'bottom',
        visibilityTime: 2000,
      });
    }, 300);
  }, []);

  /**
   * Toggle a reminder's enabled status
   */
  const toggleReminderEnabled = useCallback(async (id) => {
    let updatedReminder = null;
    
    setReminders(prev => {
      const newReminders = prev.map(reminder => {
        if (reminder.id === id) {
          updatedReminder = { ...reminder, enabled: !reminder.enabled };
          return updatedReminder;
        }
        return reminder;
      });
      return newReminders;
    });
    
    // If we found and toggled the reminder, update its notification
    if (updatedReminder) {
      try {
        if (updatedReminder.enabled) {
          // If now enabled, schedule a notification
          await NotificationService.scheduleReminderNotification(updatedReminder);
        } else {
          // If now disabled, cancel any existing notification
          await NotificationService.cancelNotification(id);
        }
      } catch (error) {
        console.error('Error updating notification after toggle:', error);
      }
    }
  }, []);

  /**
   * Toggle all reminders enabled status
   */
  const toggleAllReminders = useCallback((enabled) => {
    const updatedReminders = reminders.map(reminder => ({
      ...reminder,
      enabled: enabled
    }));
    
    setReminders(updatedReminders);
  }, [reminders]);

  /**
   * Get reminders for a specific plant
   */
  const getPlantReminders = useCallback((plantId) => {
    return reminders.filter(reminder => reminder.plant_id === plantId);
  }, [reminders]);
  
  /**
   * Get all active reminders
   */
  const getActiveReminders = useCallback(() => {
    return reminders.filter(reminder => reminder.enabled);
  }, [reminders]);
  
  /**
   * Check if all reminders are enabled
   */
  const areAllRemindersEnabled = useCallback(() => {
    if (reminders.length === 0) return false;
    return reminders.every(reminder => reminder.enabled);
  }, [reminders]);

  /**
   * Mark a reminder as completed and reschedule it
   */
  const completeReminder = useCallback((id) => {
    setReminders(prev => 
      prev.map(reminder => {
        if (reminder.id === id) {
          const nextDue = calculateNextDueDate(reminder.frequency_days);
          return { 
            ...reminder, 
            next_due: nextDue.toISOString(),
            last_completed: new Date().toISOString()
          };
        }
        return reminder;
      })
    );
  }, []);

  /**
   * Generate default reminders for a plant based on plant type
   */
  // generateDefaultReminders function removed

  // Context value
  const value = {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminderEnabled,
    toggleAllReminders,
    getPlantReminders,
    getActiveReminders,
    areAllRemindersEnabled,
    completeReminder,
    // generateDefaultReminders removed as the function no longer exists
    isLoaded
  };

  return (
    <ReminderContext.Provider value={value}>
      {children}
    </ReminderContext.Provider>
  );
}

/**
 * Hook to use the reminder context
 */
export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
};
