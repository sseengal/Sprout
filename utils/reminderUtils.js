/**
 * Utility functions for plant care reminders
 */

/**
 * Format a date for display in the UI
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatReminderDate = (date) => {
  if (!date) return '';
  
  const options = { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  };
  
  return new Date(date).toLocaleDateString(undefined, options);
};

/**
 * Calculate the next due date based on frequency
 * @param {number} frequencyDays - Frequency in days
 * @param {Date} startDate - Starting date (defaults to now)
 * @returns {Date} Next due date
 */
export const calculateNextDueDate = (frequencyDays, startDate = new Date()) => {
  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + frequencyDays);
  return nextDate;
};

/**
 * Get a human-readable frequency label
 * @param {number} frequencyDays - Frequency in days
 * @returns {string} Human-readable frequency
 */
export const getFrequencyLabel = (frequencyDays) => {
  switch (frequencyDays) {
    case 1:
      return 'Daily';
    case 7:
      return 'Weekly';
    case 14:
      return 'Bi-weekly';
    case 30:
      return 'Monthly';
    default:
      return `Every ${frequencyDays} days`;
  }
};

/**
 * Get care type icon name (for MaterialIcons)
 * @param {string} careType - Type of care (watering, fertilizing)
 * @returns {string} Icon name
 */
export const getCareTypeIcon = (careType) => {
  switch (careType.toLowerCase()) {
    case 'watering':
      return 'water-drop';
    case 'fertilizing':
      return 'compost';
    default:
      return 'notifications';
  }
};

/**
 * Get care type color
 * @param {string} careType - Type of care (watering, fertilizing)
 * @returns {string} Color hex code
 */
export const getCareTypeColor = (careType) => {
  switch (careType.toLowerCase()) {
    case 'watering':
      return '#2196F3'; // Blue
    case 'fertilizing':
      return '#8BC34A'; // Light Green
    default:
      return '#9E9E9E'; // Gray
  }
};

/**
 * Generate a unique ID for reminders
 * @returns {string} Unique ID
 */
export const generateReminderId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Get days remaining until the due date
 * @param {Date} dueDate - The due date
 * @returns {number} Days remaining
 */
export const getDaysRemaining = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get status of a reminder based on due date
 * @param {Date} dueDate - The due date
 * @returns {string} Status: 'overdue', 'due-soon', or 'upcoming'
 */
export const getReminderStatus = (dueDate) => {
  const daysRemaining = getDaysRemaining(dueDate);
  
  if (daysRemaining < 0) {
    return 'overdue';
  } else if (daysRemaining <= 2) {
    return 'due-soon';
  } else {
    return 'upcoming';
  }
};
