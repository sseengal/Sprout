import { Platform } from 'react-native';

/**
 * Formats a string to title case
 * @param {string} str - The string to format
 * @returns {string} - The formatted string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncates a string to a specified length and adds an ellipsis
 * @param {string} str - The string to truncate
 * @param {number} maxLength - The maximum length of the string
 * @returns {string} - The truncated string
 */
export const truncate = (str, maxLength = 100) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};

/**
 * Formats a date to a readable string
 * @param {Date|string|number} date - The date to format
 * @returns {string} - The formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Checks if the device is an iOS device
 * @returns {boolean} - True if the device is iOS, false otherwise
 */
export const isIOS = () => {
  return Platform.OS === 'ios';
};

/**
 * Checks if the device is an Android device
 * @returns {boolean} - True if the device is Android, false otherwise
 */
export const isAndroid = () => {
  return Platform.OS === 'android';
};

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if the email is valid, false otherwise
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} - The debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Formats a number with commas as thousand separators
 * @param {number} num - The number to format
 * @returns {string} - The formatted number string
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string
 */
export const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Generates a random ID
 * @param {number} length - The length of the ID
 * @returns {string} - The generated ID
 */
export const generateId = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Checks if a value is empty
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is empty, false otherwise
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};
