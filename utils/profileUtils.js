/**
 * Utility functions for the profile screen
 */

/**
 * Format a date string to a human-readable format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get the appropriate color for a subscription status
 * @param {string} status - The subscription status
 * @returns {string} Color code for the status
 */
export const getStatusColor = (status) => {
  if (!status) return '#757575';
  
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'active':
      return '#4CAF50'; // Green
    case 'trialing':
    case 'trial':
      return '#2196F3'; // Blue
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return '#F44336'; // Red
    case 'canceled':
    case 'cancelled':
    case 'unsubscribed':
      return '#9E9E9E'; // Gray
    case 'inactive':
    default:
      return '#757575'; // Dark gray
  }
};

/**
 * Calculate the number of trial days remaining
 * @param {string} trialEndDate - The trial end date
 * @returns {number} Number of days remaining
 */
export const getTrialDaysRemaining = (trialEndDate) => {
  if (!trialEndDate) return 0;
  const end = new Date(trialEndDate).getTime();
  const now = new Date().getTime();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

/**
 * Get formatted status text based on subscription status
 * @param {string} status - The subscription status
 * @param {string} trialEndDate - The trial end date (if applicable)
 * @returns {string} Formatted status text
 */
export const getStatusText = (status, trialEndDate) => {
  if (!status) return 'Inactive';
  
  // Format the status text
  let statusText = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  
  // Add trial days remaining if in trial
  if (status === 'trialing' && trialEndDate) {
    const daysLeft = getTrialDaysRemaining(trialEndDate);
    statusText += ` - ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  }
  
  return statusText;
};
