import { useCallback, useState } from 'react';
import { getAvailableCredits, useAnalysis } from '../lib/analysisCredits';
import { recordPlantAnalysis as recordPlantAnalysisUtil } from '../lib/plantAnalysis';

/**
 * Custom hook to manage plant analysis functionality
 * @returns {Object} Analysis state and methods
 */
export const usePlantAnalysis = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches the current analysis usage for the user
   * @param {string} userId - The user's ID
   */
  const refreshUsage = useCallback(async (userId) => {
    if (!userId) {
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get available credits using the utility function
      const credits = await getAvailableCredits(userId);
      
      if (!credits) {
        setError({ 
          error: 'CREDITS_FETCH_ERROR', 
          message: 'Failed to fetch available credits' 
        });
        setUsage(null);
        return;
      }

      // Update usage with the credits data
      setUsage({
        remaining: credits.total,
        trial: credits.trial,
        subscription: credits.subscription,
        purchase: credits.purchase,
        total: credits.total,
        monthlyLimit: credits.subscription > 0 ? 20 : 5 // Default to 5 for non-subscribers, 20 for subscribers
      });
    } catch (err) {
      console.error('Error in refreshUsage:', err);
      setError({ 
        error: 'REFRESH_ERROR', 
        message: err.message || 'Failed to refresh usage data' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Checks if the user can perform another analysis
   * @param {string} userId - The user's ID
   * @returns {Promise<boolean>} Whether the user can perform analysis
   */
  const checkCanAnalyze = useCallback(async (userId) => {
    if (!userId) return false;
    
    try {
      const credits = await getAvailableCredits(userId);
      return credits.total > 0;
    } catch (error) {
      console.error('Error checking analysis permission:', error);
      return false;
    }
  }, []);

  /**
   * Records a new plant analysis
   * @param {string} userId - The user's ID
   * @param {string} analysisType - Type of analysis
   * @param {string} plantName - Name of the identified plant
   * @param {number} confidenceScore - Confidence score from 0-1
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const recordAnalysis = useCallback(async (userId, analysisType, plantName, confidenceScore) => {
    if (!userId) {
      return { 
        success: false, 
        error: 'MISSING_USER_ID',
        message: 'User ID is required' 
      };
    }

    const result = await recordPlantAnalysisUtil(
      userId,
      analysisType,
      plantName,
      confidenceScore
    );

    // Refresh usage after recording if successful
    if (result.success) {
      // Use the useAnalysis utility to decrement the credit count
      const { success } = await useAnalysis(userId);
      if (success) {
        await refreshUsage(userId);
      }
    }

    return result;
  }, [refreshUsage]);

  return {
    // State
    usage,
    loading,
    error,
    
    // Methods
    refreshUsage,
    checkCanAnalyze,
    recordAnalysis
  };
};
