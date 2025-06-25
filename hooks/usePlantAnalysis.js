import { useState, useEffect, useCallback } from 'react';
import { 
  getUserAnalysisUsage, 
  canPerformAnalysis as canPerformAnalysisUtil,
  recordPlantAnalysis as recordPlantAnalysisUtil
} from '../lib/plantAnalysis';
import { supabase } from '../lib/supabase';

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
      // Get usage data
      const { data: usageData, error: usageError, message } = await getUserAnalysisUsage(userId);
      
      if (usageError) {
        setError({ error: usageError, message });
        setUsage(null);
        return;
      }

      // Get user's plan limit
      const { data: planData, error: planError } = await supabase
        .from('customers')
        .select('plan_limit_id, plan_limits(monthly_analyses_limit)')
        .eq('user_id', userId)
        .single();

      if (planError) {
        console.error('Error fetching plan limit:', planError);
        // Default to free plan limit if we can't fetch the plan
        setUsage({
          ...usageData,
          remaining: 5 - (usageData.currentBillingCycleAnalyses || 0),
          monthlyLimit: 5
        });
        return;
      }

      // Calculate remaining analyses
      const monthlyLimit = planData?.plan_limits?.monthly_analyses_limit || 5;
      const remaining = Math.max(0, monthlyLimit - (usageData.currentBillingCycleAnalyses || 0));

      // Update usage with remaining count
      setUsage({
        ...usageData,
        remaining,
        monthlyLimit
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
    
    const { data, error: checkError } = await canPerformAnalysisUtil(userId);
    return !checkError && data === true;
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
      await refreshUsage(userId);
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
