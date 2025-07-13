import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReminderId, calculateNextDueDate } from '../utils/reminderUtils';
import * as NotificationService from '../services/notificationService';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

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
  const navigationRef = useRef(null);

  // Load reminders from AsyncStorage on mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const storedReminders = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedReminders) {
          const parsedReminders = JSON.parse(storedReminders);
          console.log(`[DEBUG] Loaded ${parsedReminders.length} reminders from storage`);
          if (parsedReminders.length > 0) {
            console.log('[DEBUG] First stored reminder:', JSON.stringify(parsedReminders[0]));
          }
          setReminders(parsedReminders);
        } else {
          console.log('[DEBUG] No reminders found in storage');
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
        console.log('[DEBUG] Notification received:', JSON.stringify(notification));
      },
      // When user interacts with notification
      (response) => {
        console.log('[DEBUG] Notification response received:', JSON.stringify(response));
        
        try {
          const data = response.notification.request.content.data;
          console.log('[DEBUG] Notification data:', JSON.stringify(data));
          
          const reminderId = data?.reminderId;
          const plantId = data?.plantId;
          const careType = data?.careType;
          
          console.log(`[DEBUG] Extracted from notification - reminderId: ${reminderId}, plantId: ${plantId}, careType: ${careType}`);
          
          if (reminderId && plantId) {
            console.log(`[DEBUG] User tapped on notification for reminder: ${reminderId}, plant: ${plantId}`);
            
            // Navigate to the plant profile with reminders tab selected
            if (navigationRef.current) {
              console.log('[DEBUG] Using navigationRef.current to navigate');
              console.log('[DEBUG] Navigation params:', JSON.stringify({
                id: plantId,
                initialTab: 'reminders',
                reminderId: reminderId
              }));
              
              navigationRef.current.navigate('plant-profile', {
                id: plantId,
                initialTab: 'reminders',
                reminderId: reminderId
              });
              console.log('[DEBUG] Navigation called');
            } else {
              console.log('[DEBUG] Navigation ref not available, trying alternative navigation');
              // Store the navigation intent for when navigation becomes available
              setTimeout(() => {
                try {
                  console.log('[DEBUG] Using Expo Router to navigate');
                  
                  // Import the router dynamically
                  const { router } = require('expo-router');
                  console.log('[DEBUG] Router imported successfully');
                  
                  // Construct the navigation params
                  const params = {
                    id: plantId,
                    initialTab: 'reminders',
                    reminderId: reminderId
                  };
                  
                  console.log('[DEBUG] Navigation params:', JSON.stringify(params));
                  
                  // Use expo-router to navigate
                  console.log('[DEBUG] Calling router.push with pathname: /plant-profile');
                  router.push({
                    pathname: 'plant-profile',  // Remove leading slash for better compatibility
                    params: params
                  });
                  
                  console.log('[DEBUG] Expo Router navigation called successfully');
                } catch (error) {
                  console.error('[ERROR] Failed to navigate after notification tap:', error);
                  console.error('[ERROR] Error details:', error.message);
                  console.error('[ERROR] Error stack:', error.stack);
                  
                  // Fallback navigation attempt
                  try {
                    console.log('[DEBUG] Attempting fallback navigation with router.navigate');
                    const { router } = require('expo-router');
                    router.navigate({
                      pathname: 'plant-profile',
                      params: {
                        id: plantId,
                        initialTab: 'reminders',
                        reminderId: reminderId
                      }
                    });
                  } catch (fallbackError) {
                    console.error('[ERROR] Fallback navigation failed:', fallbackError.message);
                  }
                }
              }, 500);  // Reduced timeout for faster response
            }
          } else {
            console.log('[DEBUG] Missing required data in notification: reminderId or plantId');
          }
        } catch (error) {
          console.error('[ERROR] Error processing notification response:', error);
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
  
  // Set up listener for plant deletion events in a separate useEffect
  useEffect(() => {
    // Only set up if reminders are loaded
    if (!isLoaded) return;
    
    const checkPlantDeletedEvent = async () => {
      try {
        const eventData = await AsyncStorage.getItem('PLANT_DELETED_EVENT');
        if (eventData) {
          const { plantId, timestamp } = JSON.parse(eventData);
          const now = Date.now();
          
          // Only process events that are less than 5 seconds old to avoid processing old events
          if (now - timestamp < 5000) {
            console.log(`[DEBUG] Detected plant deletion event for plant ID: ${plantId}`);
            
            // Clean up reminders for the deleted plant
            setReminders(prev => {
              const updatedReminders = prev.filter(r => {
                if (String(r.plant_id) !== String(plantId)) {
                  return true;
                }
                
                // For reminders being removed, cancel their notifications
                console.log(`[DEBUG] Removing reminder ${r.id} for deleted plant ${plantId}`);
                NotificationService.cancelNotification(r.id)
                  .catch(error => console.error(`Error cancelling notification for reminder ${r.id}:`, error));
                
                return false;
              });
              
              const removedCount = prev.length - updatedReminders.length;
              console.log(`[DEBUG] Removed ${removedCount} reminders for deleted plant ${plantId}`);
              return updatedReminders;
            });
          }
        }
      } catch (error) {
        console.error('Error checking plant deleted event:', error);
      }
    };
    
    // Check for plant deletion events periodically
    const eventCheckInterval = setInterval(checkPlantDeletedEvent, 1000);
    
    return () => clearInterval(eventCheckInterval);
  }, [isLoaded]);

  // Save reminders to AsyncStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      console.log(`[DEBUG] Saving ${reminders.length} reminders to AsyncStorage`);
      
      // Make sure we're not saving null or undefined
      if (!reminders) {
        console.error('[DEBUG] Attempted to save null/undefined reminders to AsyncStorage');
        return;
      }
      
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
        .then(() => {
          console.log('[DEBUG] Successfully saved reminders to AsyncStorage');
        })
        .catch(error => {
          console.error('Error saving reminders:', error);
        });
        
      // Schedule notifications for all active reminders
      NotificationService.scheduleAllReminders(reminders)
        .catch(error => console.error('Error scheduling notifications:', error));
    }
  }, [reminders, isLoaded]);
  
  // Load saved plants and keep them in sync
  useEffect(() => {
    // Import the correct storage key from plantStorage.js
    const SAVED_PLANTS_KEY = '@saved_plants';
    
    const loadSavedPlants = async () => {
      try {
        console.log('[DEBUG] Loading saved plants using key:', SAVED_PLANTS_KEY);
        const data = await AsyncStorage.getItem(SAVED_PLANTS_KEY);
        if (data) {
          const plants = JSON.parse(data);
          console.log(`[DEBUG] Loaded ${plants.length} saved plants`);
          if (plants.length > 0) {
            console.log('[DEBUG] First plant ID:', plants[0].id);
          }
          setSavedPlants(plants);
        } else {
          console.log('[DEBUG] No saved plants found in storage');
          setSavedPlants([]);
        }
      } catch (error) {
        console.error('Error loading saved plants in ReminderContext:', error);
        setSavedPlants([]);
      }
    };
    
    loadSavedPlants();
    
    // Set up listener for saved plants changes
    const savedPlantsListener = async () => {
      try {
        const data = await AsyncStorage.getItem(SAVED_PLANTS_KEY);
        if (data) {
          const plants = JSON.parse(data);
          // Only update if the number of plants has changed to avoid unnecessary re-renders
          setSavedPlants(prevPlants => {
            if (prevPlants.length !== plants.length) {
              console.log(`[DEBUG] Plants count changed: ${prevPlants.length} -> ${plants.length}`);
              return plants;
            }
            return prevPlants;
          });
        }
      } catch (error) {
        console.error('Error in saved plants listener:', error);
      }
    };
    
    // Listen for storage changes (this works in Expo Go)
    const interval = setInterval(savedPlantsListener, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Clean up reminders for deleted plants - with extra caution
  useEffect(() => {
    // Only run if both reminders and plants are loaded
    if (!isLoaded) {
      console.log('[DEBUG] Skipping cleanup - reminders not fully loaded yet');
      return;
    }
    
    if (savedPlants.length === 0) {
      console.log('[DEBUG] Skipping cleanup - no saved plants available');
      return;
    }
    
    if (reminders.length === 0) {
      console.log('[DEBUG] Skipping cleanup - no reminders to check');
      return;
    }
    
    console.log(`[DEBUG] Starting cleanup check with ${savedPlants.length} plants and ${reminders.length} reminders`);
    
    // Create a set of saved plant IDs for faster lookup
    // Convert plant IDs to strings for consistent comparison
    const savedPlantIds = new Set(savedPlants.map(plant => String(plant.id)));
    
    // Debug log saved plant IDs
    console.log('[DEBUG] Saved plant IDs:', JSON.stringify(Array.from(savedPlantIds)));
    
    // Log all reminder plant IDs for debugging
    const reminderPlantIds = reminders
      .filter(r => r.plant_id)
      .map(r => String(r.plant_id));
    console.log('[DEBUG] Reminder plant IDs:', JSON.stringify(reminderPlantIds));
    
    // Find reminders for plants that no longer exist
    const remindersToDelete = reminders.filter(reminder => {
      // Skip reminders without plant_id
      if (!reminder.plant_id) {
        console.log('[DEBUG] Skipping reminder without plant_id:', reminder.id);
        return false;
      }
      
      // Convert plant_id to string for consistent comparison
      const plantIdStr = String(reminder.plant_id);
      const exists = savedPlantIds.has(plantIdStr);
      
      // Debug log for each reminder's plant existence check
      if (!exists) {
        console.log(`[DEBUG] Plant ID ${plantIdStr} not found in saved plants for reminder ${reminder.id}`);
        console.log('[DEBUG] Reminder details:', JSON.stringify(reminder));
      }
      
      return !exists;
    });
    
    // Delete reminders for plants that no longer exist
    if (remindersToDelete.length > 0) {
      console.log(`[DEBUG] Found ${remindersToDelete.length} reminders for deleted plants`);
      console.log('[DEBUG] Reminders to delete:', JSON.stringify(remindersToDelete.map(r => ({ id: r.id, plant_id: r.plant_id }))));
      
      console.log('[DEBUG] Cleaning up reminders for deleted plants');
      
      // Use a single state update for better performance
      setReminders(prev => {
        const updatedReminders = prev.filter(r => {
          // Keep reminders that don't have a plant_id or whose plant still exists
          if (!r.plant_id || savedPlantIds.has(String(r.plant_id))) {
            return true;
          }
          
          // For reminders being removed, cancel their notifications
          console.log(`[DEBUG] Removing reminder ${r.id} for deleted plant ${r.plant_id}`);
          NotificationService.cancelNotification(r.id)
            .catch(error => console.error(`Error cancelling notification for reminder ${r.id}:`, error));
          
          return false;
        });
        
        console.log(`[DEBUG] Removed ${prev.length - updatedReminders.length} reminders for deleted plants`);
        return updatedReminders;
      });
    } else {
      console.log('[DEBUG] No orphaned reminders found');
    }
  }, [savedPlants, reminders, isLoaded]);

  /**
   * Add a new reminder
   */
  const addReminder = useCallback(async (reminder) => {
    console.log('[DEBUG] Adding new reminder:', JSON.stringify(reminder));
    
    const newReminder = {
      id: generateReminderId(),
      created_at: new Date().toISOString(),
      ...reminder
    };

    console.log('[DEBUG] Created new reminder with ID:', newReminder.id);
    
    // Explicitly save to AsyncStorage to ensure persistence
    setReminders(prev => {
      const updatedReminders = [...prev, newReminder];
      console.log(`[DEBUG] Updated reminders state, now has ${updatedReminders.length} reminders`);
      
      // Force save to AsyncStorage immediately
      if (isLoaded) {
        console.log('[DEBUG] Force saving reminders to AsyncStorage');
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReminders))
          .then(() => console.log('[DEBUG] Force save successful'))
          .catch(err => console.error('[DEBUG] Force save failed:', err));
      }
      
      return updatedReminders;
    });
    
    // Schedule notification for the new reminder
    if (newReminder.enabled !== false) {
      try {
        await NotificationService.scheduleReminderNotification(newReminder);
        console.log('[DEBUG] Scheduled notification for new reminder');
      } catch (error) {
        console.error('Error scheduling notification for new reminder:', error);
      }
    }
    
    return newReminder;
  }, [isLoaded]);

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
    if (!plantId) {
      console.log('[DEBUG] getPlantReminders called with null/undefined plantId');
      return [];
    }
    
    const filteredReminders = reminders.filter(reminder => {
      // Convert both to strings for comparison to handle potential type mismatches
      return String(reminder.plant_id) === String(plantId);
    });
    
    console.log(`[DEBUG] getPlantReminders for plant ${plantId}: found ${filteredReminders.length}`);
    return filteredReminders;
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
   * @param {string} id - The ID of the reminder to complete
   * @param {boolean} skipped - Whether the reminder was skipped (default: false)
   * @returns {Promise<Object>} - The updated reminder
   */
  const completeReminder = useCallback(async (id, skipped = false) => {
    console.log(`[DEBUG] ReminderContext.completeReminder - Starting for reminder ID: ${id}, skipped: ${skipped}`);
    
    // First, ensure we have the latest reminders from storage
    let currentReminders = reminders;
    if (reminders.length === 0) {
      console.log('[DEBUG] ReminderContext.completeReminder - No reminders in state, loading from storage');
      try {
        const storedReminders = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedReminders) {
          currentReminders = JSON.parse(storedReminders);
          console.log(`[DEBUG] ReminderContext.completeReminder - Loaded ${currentReminders.length} reminders from storage`);
          // Update state for future operations
          setReminders(currentReminders);
        } else {
          console.log('[DEBUG] ReminderContext.completeReminder - No reminders found in storage');
        }
      } catch (error) {
        console.error('[ERROR] Failed to load reminders from storage:', error);
      }
    }
    
    // Normalize the ID for comparison (trim any whitespace)
    const normalizedId = id.toString().trim();
    console.log(`[DEBUG] ReminderContext.completeReminder - Looking for normalized ID: ${normalizedId}`);
    
    // Log all reminder IDs for debugging
    console.log(`[DEBUG] ReminderContext.completeReminder - Available reminder IDs:`, 
      JSON.stringify(currentReminders.map(r => r.id)));
    
    const reminderToUpdate = currentReminders.find(r => {
      const currentId = r.id.toString().trim();
      const matches = currentId === normalizedId;
      console.log(`[DEBUG] Comparing ${currentId} with ${normalizedId}: ${matches}`);
      return matches;
    });
    
    if (!reminderToUpdate) {
      console.error(`[ERROR] ReminderContext.completeReminder - Reminder with ID ${id} not found`);
      // Try to find a reminder for the same plant if we have plant ID
      const plantReminders = currentReminders.filter(r => r.plant_id === id);
      if (plantReminders.length > 0) {
        console.log(`[DEBUG] Found ${plantReminders.length} reminders for plant ID ${id} instead`);
        const dueReminder = plantReminders.find(r => {
          const nextDue = new Date(r.next_due);
          return nextDue <= new Date();
        });
        
        if (dueReminder) {
          console.log(`[DEBUG] Using due reminder with ID ${dueReminder.id} instead`);
          return completeReminder(dueReminder.id, skipped);
        }
      }
      return null;
    }
    
    console.log(`[DEBUG] ReminderContext.completeReminder - Found reminder:`, JSON.stringify(reminderToUpdate));
    
    let updatedReminder = null;
    
    setReminders(prev => {
      console.log(`[DEBUG] ReminderContext.completeReminder - Current reminders count: ${prev.length}`);
      
      const newReminders = prev.map(reminder => {
        if (reminder.id === id) {
          const nextDue = calculateNextDueDate(reminder.frequency_days);
          const now = new Date().toISOString();
          
          console.log(`[DEBUG] ReminderContext.completeReminder - Calculated next due date: ${nextDue.toISOString()}`);
          
          updatedReminder = { 
            ...reminder, 
            next_due: nextDue.toISOString(),
            last_completed: skipped ? reminder.last_completed : now,
            last_skipped: skipped ? now : reminder.last_skipped,
            status: skipped ? 'skipped' : 'completed'
          };
          
          console.log(`[DEBUG] ReminderContext.completeReminder - Updated reminder:`, JSON.stringify(updatedReminder));
          return updatedReminder;
        }
        return reminder;
      });
      
      console.log(`[DEBUG] ReminderContext.completeReminder - New reminders count: ${newReminders.length}`);
      return newReminders;
    });
    
    // Wait for state update to complete
    console.log(`[DEBUG] ReminderContext.completeReminder - Waiting for state update to complete`);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    return updatedReminder;
  }, []);

  /**
   * Reload reminders from AsyncStorage
   */
  const reloadReminders = useCallback(async () => {
    console.log('[DEBUG] Explicitly reloading reminders from AsyncStorage');
    try {
      const storedReminders = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedReminders) {
        const parsedReminders = JSON.parse(storedReminders);
        console.log(`[DEBUG] Reloaded ${parsedReminders.length} reminders from storage`);
        setReminders(parsedReminders);
        return parsedReminders;
      } else {
        console.log('[DEBUG] No reminders found in storage during reload');
        return [];
      }
    } catch (error) {
      console.error('Error reloading reminders:', error);
      return [];
    }
  }, []);

  // Set navigation ref when available
  useEffect(() => {
    try {
      const nav = require('@react-navigation/native').navigationRef;
      navigationRef.current = nav;
    } catch (error) {
      console.error('Failed to get navigation ref:', error);
    }
  }, []);

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
    reloadReminders,
    isLoaded,
    setNavigationRef: (ref) => {
      navigationRef.current = ref;
    }
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
