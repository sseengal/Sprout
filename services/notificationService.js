/**
 * Notification service for plant care reminders using Expo Notifications
 * 
 * NOTE: As of Expo SDK 53+, Android push notifications (remote notifications) are not supported in Expo Go.
 * Local notifications for scheduled reminders should still work, but remote push notifications will not.
 * This limitation only affects Expo Go and not development or production builds.
 * See: https://docs.expo.dev/develop/development-builds/introduction/
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCareTypeColor } from '../utils/reminderUtils';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Schedule a notification for a care reminder
 * @param {Object} reminder - The reminder object
 * @returns {Promise<string>} - A promise that resolves to the notification ID
 */
export const scheduleReminderNotification = async (reminder) => {
  const { id, care_type, plant_name, next_due, notes } = reminder;
  
  try {
    // Format the notification content with more context
    const title = `${care_type.charAt(0).toUpperCase() + care_type.slice(1)} Reminder: ${plant_name}`;
    
    // Create a more contextual message based on care type
    let body = '';
    if (care_type === 'watering') {
      body = `Your ${plant_name} needs water! ${notes ? notes : 'Keep soil moist but not soggy.'}`;
    } else if (care_type === 'fertilizing') {
      body = `Time to fertilize your ${plant_name}! ${notes ? notes : 'Use a balanced fertilizer for best results.'}`;
    } else {
      body = `Time to ${care_type} your ${plant_name}. ${notes || ''}`;
    }
    
    // Calculate trigger date
    const triggerDate = new Date(next_due);
    const now = new Date();
    
    // If the date is in the past, use the current date for notification
    // This ensures the reminder still appears in the list but doesn't schedule a notification
    if (triggerDate <= now) {
      console.log(`[NOTIFICATION] Reminder date is in the past (${triggerDate.toISOString()}), using current date`);
      // Just log it but still continue with the current date
    }
    
    // Get icon for the notification based on care type
    const categoryIdentifier = Platform.OS === 'ios' ? care_type : undefined;
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          reminderId: id,
          careType: care_type,
          plantName: plant_name,
          notes: notes || ''
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: getCareTypeColor(care_type),
        categoryIdentifier, // For iOS notification categories
        // Add badge count for iOS
        badge: 1,
      },
      trigger: {
        date: triggerDate,
      },
      identifier: `reminder-${id}`,
    });
    
    console.log(`[NOTIFICATION] Scheduled for ${triggerDate.toLocaleString()}`);
    console.log(`[NOTIFICATION] ${care_type} reminder for ${plant_name}`);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification
 * @param {string} reminderId - The ID of the reminder to cancel
 * @returns {Promise<void>}
 */
export const cancelNotification = async (reminderId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder-${reminderId}`);
    console.log(`[NOTIFICATION] Cancelled notification for reminder: ${reminderId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

/**
 * Request notification permissions
 * @returns {Promise<boolean>} - Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Only ask if permissions have not been determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Check if we got permissions
    const granted = finalStatus === 'granted';
    console.log(`[NOTIFICATION] Permissions ${granted ? 'granted' : 'denied'}`);
    return granted;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Trigger a test foreground notification (appears while app is open)
 * @param {string} careType - Type of care (watering, fertilizing, etc.)
 * @param {string} plantName - Name of the plant
 * @returns {Promise<string>} - Notification ID
 */
export const triggerTestForegroundNotification = async (careType, plantName = 'Test Plant') => {
  try {
    // Format the notification content with more context
    const title = `${careType.charAt(0).toUpperCase() + careType.slice(1)} Reminder: ${plantName}`;
    
    // Create a contextual message based on care type
    let body = '';
    if (careType === 'watering') {
      body = `Your ${plantName} needs water! Keep soil moist but not soggy.`;
    } else if (careType === 'fertilizing') {
      body = `Time to fertilize your ${plantName}! Use a balanced fertilizer for best results.`;
    } else {
      body = `Time to ${careType} your ${plantName}.`;
    }
    
    // Get icon for the notification based on care type
    const categoryIdentifier = Platform.OS === 'ios' ? careType : undefined;
    
    // Schedule the notification to appear immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          testType: 'foreground',
          careType: careType,
          plantName: plantName
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: getCareTypeColor(careType),
        categoryIdentifier,
        badge: 1,
      },
      trigger: null, // null means show immediately
    });
    
    console.log(`[TEST] Foreground notification triggered for ${careType}`);
    return notificationId;
  } catch (error) {
    console.error('Error triggering test foreground notification:', error);
    return null;
  }
};

/**
 * Trigger a test background notification (appears after delay to simulate background state)
 * @param {string} careType - Type of care (watering, fertilizing, etc.)
 * @param {string} plantName - Name of the plant
 * @returns {Promise<string>} - Notification ID
 */
export const triggerTestBackgroundNotification = async (careType, plantName = 'Test Plant') => {
  try {
    // Format the notification content with more context
    const title = `${careType.charAt(0).toUpperCase() + careType.slice(1)} Reminder: ${plantName}`;
    
    // Create a contextual message based on care type
    let body = '';
    if (careType === 'watering') {
      body = `Your ${plantName} needs water! Keep soil moist but not soggy.`;
    } else if (careType === 'fertilizing') {
      body = `Time to fertilize your ${plantName}! Use a balanced fertilizer for best results.`;
    } else {
      body = `Time to ${careType} your ${plantName}.`;
    }
    
    // Calculate trigger date (5 seconds from now to simulate background)
    const triggerDate = new Date(Date.now() + 5000);
    
    // Get icon for the notification based on care type
    const categoryIdentifier = Platform.OS === 'ios' ? careType : undefined;
    
    // Schedule the notification to appear after delay
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          testType: 'background',
          careType: careType,
          plantName: plantName
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: getCareTypeColor(careType),
        categoryIdentifier,
        badge: 1,
      },
      trigger: { date: triggerDate },
    });
    
    console.log(`[TEST] Background notification scheduled for ${triggerDate.toLocaleTimeString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling test background notification:', error);
    return null;
  }
};

/**
 * Check if notification permissions are granted
 * @returns {Promise<boolean>} - Whether permissions are granted
 */
export const checkNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const granted = status === 'granted';
    console.log(`[NOTIFICATION] Permission status: ${status}`);
    return granted;
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

/**
 * Schedule notifications for all active reminders
 * @param {Array} reminders - Array of reminder objects
 * @returns {Promise<void>}
 */
export const scheduleAllReminders = async (reminders) => {
  try {
    // First, ensure we have permissions
    const hasPermissions = await requestNotificationPermissions();
    if (!hasPermissions) {
      console.log('[NOTIFICATION] Cannot schedule reminders: no permissions');
      return;
    }
    
    // Cancel existing notifications before scheduling new ones
    await cancelAllNotifications();
    
    // Filter for enabled reminders
    const activeReminders = reminders.filter(reminder => reminder.enabled);
    
    console.log(`[NOTIFICATION] Scheduling ${activeReminders.length} reminders`);
    
    // Schedule notifications for each active reminder
    for (const reminder of activeReminders) {
      await scheduleReminderNotification(reminder);
    }
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
};

/**
 * Cancel all scheduled notifications
 * @returns {Promise<void>}
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[NOTIFICATION] Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

/**
 * Set up notification listeners
 * @param {Function} onNotificationReceived - Callback for when notification is received
 * @param {Function} onNotificationResponse - Callback for when user interacts with notification
 * @returns {Object} - Subscription objects that should be cleaned up on unmount
 */
export const setNotificationListeners = (onNotificationReceived, onNotificationResponse) => {
  // When a notification is received while the app is in the foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });
  
  // When the user interacts with a notification (e.g., taps on it)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });
  
  return { receivedSubscription, responseSubscription };
};

/**
 * Clean up notification listeners
 * @param {Object} subscriptions - The subscription objects to remove
 */
export const removeNotificationListeners = (subscriptions) => {
  if (subscriptions?.receivedSubscription) {
    subscriptions.receivedSubscription.remove();
  }
  if (subscriptions?.responseSubscription) {
    subscriptions.responseSubscription.remove();
  }
};
