import { supabase } from './supabase';

/**
 * Records a new plant analysis in the database
 * @param {string} userId - The user's ID
 * @param {string} analysisType - Type of analysis (e.g., 'plant_identification')
 * @param {string} plantName - Name of the identified plant
 * @param {number} confidenceScore - Confidence score from 0-1
 * @returns {Promise<{success: boolean, data?: {analysisId: string}, error?: string, message?: string}>}
 */
export const recordPlantAnalysis = async (userId, analysisType, plantName, confidenceScore) => {
  if (!userId) {
    return {
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required'
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('record_plant_analysis', {
        p_user_id: userId,
        p_analysis_type: analysisType,
        p_plant_name: plantName,
        p_confidence_score: confidenceScore
      });

    if (error) {
      if (error.message.includes('limit reached')) {
        return { 
          success: false, 
          error: 'ANALYSIS_LIMIT_REACHED',
          message: 'You have reached your analysis limit for this billing cycle.' 
        };
      }
      throw error;
    }

    return { 
      success: true, 
      data: { analysisId: data } 
    };
  } catch (error) {
    console.error('Error recording plant analysis:', error);
    return { 
      success: false, 
      error: 'ANALYSIS_ERROR',
      message: error.message || 'Failed to record plant analysis.' 
    };
  }
};

/**
 * Gets the current analysis usage for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string, message?: string}>}
 */
export const getUserAnalysisUsage = async (userId) => {
  if (!userId) {
    return {
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required'
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_analysis_usage', { p_user_id: userId });

    if (error) throw error;

    return { 
      success: true, 
      data: {
        totalAnalyses: data[0]?.total_analyses || 0,
        currentBillingCycleAnalyses: data[0]?.current_billing_cycle_analyses || 0,
        currentBillingCycleStart: data[0]?.current_billing_cycle_start,
        currentBillingCycleEnd: data[0]?.current_billing_cycle_end
      }
    };
  } catch (error) {
    console.error('Error getting analysis usage:', error);
    return { 
      success: false, 
      error: 'USAGE_FETCH_ERROR',
      message: error.message || 'Failed to fetch analysis usage.' 
    };
  }
};

/**
 * Checks if a user can perform another analysis
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, data?: boolean, error?: string, message?: string}>}
 */
export const canPerformAnalysis = async (userId) => {
  if (!userId) {
    return {
      success: false,
      error: 'MISSING_USER_ID',
      message: 'User ID is required'
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('can_perform_analysis', { p_user_id: userId });

    if (error) throw error;

    return { 
      success: true, 
      data: data 
    };
  } catch (error) {
    console.error('Error checking analysis permission:', error);
    return { 
      success: false, 
      error: 'PERMISSION_CHECK_ERROR',
      message: error.message || 'Failed to check analysis permission.' 
    };
  }
};
