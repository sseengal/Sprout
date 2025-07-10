/**
 * Utility functions for authentication
 */
import { Platform } from 'react-native';

/**
 * Get the correct redirect URL based on environment
 * @returns {string} The appropriate redirect URL
 */
export const getRedirectUrl = () => {
  // For web, use the current origin + /auth/callback
  if (Platform.OS === 'web') {
    return window.location.origin + '/auth/callback';
  }
  
  // For development with Expo web
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8081/auth/callback';
  }
  
  // For production, use the production URL
  return 'https://your-production-url.com/auth/callback';
};

/**
 * Helper function to log with timestamp and component name
 * @param {string} component - The component name to include in logs
 * @returns {Function} A logging function that includes timestamps and component name
 */
export const createLogger = (component) => {
  return (...args) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [${component}]`;
    console.log(message, ...args);
  };
};
