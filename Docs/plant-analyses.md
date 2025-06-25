# Plant Analyses Documentation

## Overview
The `plant_analyses` table and its associated functions provide a system for tracking and limiting user analyses (like plant identification) on a per-billing-cycle basis. This system helps manage API usage costs by enforcing limits based on the user's subscription plan.

## Database Schema

### Table: `public.plant_analyses`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users.id` |
| `analysis_type` | TEXT | Type of analysis (e.g., 'plant_identification', 'disease_detection') |
| `status` | TEXT | Status of the analysis ('pending', 'completed', 'failed') |
| `created_at` | TIMESTAMPTZ | When the analysis was created |
| `billing_cycle_start` | DATE | Start of the billing cycle (YYYY-MM-01) |
| `plant_name` | TEXT | Common name of the identified plant |
| `confidence_score` | NUMERIC(5,2) | Confidence score from 0-1 |

### Indexes
- `idx_plant_analyses_user_id` - For fast user lookups
- `idx_plant_analyses_created_at` - For time-based queries
- `idx_plant_analyses_billing_cycle` - For billing cycle calculations

## Functions

### 1. `get_user_analysis_usage(p_user_id UUID)`

**Returns:** A table with usage statistics

| Column | Type | Description |
|--------|------|-------------|
| `total_analyses` | BIGINT | Total analyses ever performed |
| `current_billing_cycle_analyses` | BIGINT | Analyses in current billing cycle |
| `current_billing_cycle_start` | DATE | Start of current billing cycle |
| `current_billing_cycle_end` | DATE | End of current billing cycle |

**Example:**
```sql
SELECT * FROM public.get_user_analysis_usage('user-uuid-here');
```

### 2. `can_perform_analysis(p_user_id UUID)`

**Returns:** BOOLEAN - Whether the user can perform another analysis

Checks if the user is within their analysis limit for the current billing cycle.

**Example:**
```sql
SELECT public.can_perform_analysis('user-uuid-here');
```

### 3. `record_plant_analysis(p_user_id UUID, p_analysis_type TEXT, p_plant_name TEXT, p_confidence_score NUMERIC)`

**Returns:** JSONB - Response object with analysis details and usage information

Records a new plant analysis and enforces plan-based usage limits. The function checks the user's current plan and usage before recording the analysis.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "analysisId": "884dd0eb-f7d6-4085-ac19-d2a02255ac04"
  },
  "usage": {
    "used": 1,
    "limit": 5,
    "plan_type": "free",
    "remaining": 4
  }
}
```

**Error Responses:**
- User not found or has no plan:
  ```json
  {
    "success": false,
    "error": "USER_NOT_FOUND",
    "message": "User not found or has no plan assigned"
  }
  ```
- Analysis limit reached:
  ```json
  {
    "success": false,
    "error": "ANALYSIS_LIMIT_REACHED",
    "message": "You have reached your monthly analysis limit of 5 for the free plan"
  }
  ```

**Parameters:**
- `p_user_id`: The user's UUID
- `p_analysis_type`: Type of analysis (e.g., 'plant_identification')
- `p_plant_name`: Common name of the identified plant
- `p_confidence_score`: Confidence score from 0-1

**Example:**
```sql
SELECT public.record_plant_analysis(
  'user-uuid-here',
  'plant_identification',
  'Rose',
  0.92
);
```

## Usage in Application

### 1. Checking Usage

```javascript
const { data: usage, error } = await supabase
  .rpc('get_user_analysis_usage', { p_user_id: userId });

// Usage contains:
// - total_analyses
// - current_billing_cycle_analyses
// - current_billing_cycle_start
// - current_billing_cycle_end
```

### 2. Checking if Analysis is Allowed

```javascript
const { data: canAnalyze, error } = await supabase
  .rpc('can_perform_analysis', { p_user_id: userId });

if (canAnalyze) {
  // Proceed with analysis
}
```

### 3. Recording a New Analysis

```javascript
const { data: analysisId, error } = await supabase
  .rpc('record_plant_analysis', {
    p_user_id: userId,
    p_analysis_type: 'plant_identification',
    p_plant_name: 'Rose',
    p_confidence_score: 0.92
  });

if (error) {
  if (error.message.includes('limit reached')) {
    // Show upgrade prompt
  } else {
    // Handle other errors
  }
}
```

## Row Level Security (RLS) Policies

1. **Users can view their own analyses**
   - Users can only SELECT their own analysis records

2. **Users can create their own analyses**
   - Users can only INSERT records with their own user_id

## Best Practices

1. Always check `can_perform_analysis()` before starting an analysis
2. Handle the case where `record_plant_analysis()` fails due to rate limiting
3. Display usage information to users so they know how many analyses they have left
4. Consider caching usage information to reduce database queries

## Billing Cycle

- The billing cycle starts on the 1st of each month
- Usage counters reset at the beginning of each billing cycle
- The current month's usage is calculated based on records where `billing_cycle_start = DATE_TRUNC('month', NOW())`

## Error Handling

- `record_plant_analysis()` will throw an exception if the user has reached their analysis limit
- All functions return NULL if the user is not found
- Check for errors in the Supabase response and handle appropriately

## Frontend Implementation

### 1. Utility Functions (`lib/plantAnalysis.js`)

The utility functions provide a clean API for interacting with the plant analysis backend:

#### `recordPlantAnalysis(userId, analysisType, plantName, confidenceScore)`
Records a new plant analysis.

**Parameters:**
- `userId` (string): The user's ID
- `analysisType` (string): Type of analysis (e.g., 'plant_identification')
- `plantName` (string): Name of the identified plant
- `confidenceScore` (number): Confidence score from 0-1

**Returns:**
```typescript
{
  success: boolean;
  data?: { analysisId: string };
  error?: string;
  message?: string;
}
```

#### `getUserAnalysisUsage(userId)`
Gets the current analysis usage for a user.

**Parameters:**
- `userId` (string): The user's ID

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    totalAnalyses: number;
    currentBillingCycleAnalyses: number;
    currentBillingCycleStart: Date;
    currentBillingCycleEnd: Date;
  };
  error?: string;
  message?: string;
}
```

#### `canPerformAnalysis(userId)`
Checks if a user can perform another analysis.

**Parameters:**
- `userId` (string): The user's ID

**Returns:**
```typescript
{
  success: boolean;
  data?: boolean;
  error?: string;
  message?: string;
}
```

### 2. React Hook (`hooks/usePlantAnalysis.js`)

The `usePlantAnalysis` hook provides an easy way to use the plant analysis functionality in React components.

**Usage:**
```javascript
const {
  // State
  usage,           // Current usage data
  loading,         // Loading state
  error,           // Error information
  
  // Methods
  refreshUsage,    // Refresh usage data
  checkCanAnalyze, // Check if user can analyze
  recordAnalysis   // Record a new analysis
} = usePlantAnalysis();
```

**Example Component:**
```javascript
import { usePlantAnalysis } from '../hooks/usePlantAnalysis';
import { useAuth } from '../contexts/AuthContext';

function PlantIdentification() {
  const { user } = useAuth();
  const { usage, loading, recordAnalysis } = usePlantAnalysis();

  const handleIdentify = async (image) => {
    const result = await identifyPlant(image);
    if (result.success) {
      const analysis = await recordAnalysis(
        user.id,
        'plant_identification',
        result.plantName,
        result.confidence
      );
      
      if (!analysis.success) {
        // Handle error
        if (analysis.error === 'ANALYSIS_LIMIT_REACHED') {
          // Show upgrade prompt
        }
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  
  return (
    <View>
      <Text>Analyses this month: {usage?.currentBillingCycleAnalyses}</Text>
      <Button onPress={handleIdentify} title="Identify Plant" />
    </View>
  );
}
```

## Error Handling

The utility functions and hook follow a consistent error handling pattern:

```typescript
{
  success: boolean;  // Whether the operation was successful
  data?: any;        // Response data if successful
  error?: string;    // Error code if failed
  message?: string;  // Human-readable error message
}
```

Common error codes:
- `MISSING_USER_ID`: User ID was not provided
- `ANALYSIS_LIMIT_REACHED`: User has reached their analysis limit
- `USAGE_FETCH_ERROR`: Failed to fetch usage data
- `PERMISSION_CHECK_ERROR`: Failed to check analysis permission
- `ANALYSIS_ERROR`: General analysis error

## Implementation Status

### ✅ Completed
1. Database schema for tracking plant analyses and subscription plans
2. Plan-based usage limits with `plan_limits` table
3. Customer plan assignment system
4. Row Level Security (RLS) policies
5. Updated database functions:
   - `get_user_analysis_usage`
   - `can_perform_analysis`
   - `record_plant_analysis` (now supports plan-based limits)
6. Frontend integration for usage tracking
7. Error handling and user feedback
8. Basic testing of plan limits

### 🔄 In Progress
1. UI for displaying usage and plan limits
2. Plan upgrade flow
3. Admin dashboard for managing plans

### 📝 Todo
1. Automated tests for plan limits
2. Rate limiting
3. Usage analytics
4. Email notifications for usage limits

## Next Steps

### High Priority
1. **Testing and Validation**
   - Verify analysis tracking works for all user types (free/paid)
   - Test edge cases (end of billing cycle, plan changes)
   - Verify database records are created correctly

2. **Error Handling**
   - Add user-friendly error messages
   - Handle API failures gracefully
   - Implement retry logic for failed tracking

3. **UI/UX Improvements**
   - Enhance the usage counter display
   - Add visual feedback during analysis
   - Show usage history

### Medium Priority
4. **Subscription Integration**
   - Connect with Stripe subscription plans
   - Update limits based on subscription tier
   - Handle plan upgrades/downgrades

5. **Analytics Dashboard**
   - Add admin view of usage statistics
   - Track most common plants identified
   - Monitor API usage and costs

### Future Enhancements
6. **Advanced Features**
   - Add support for different analysis types (disease detection, etc.)
   - Implement batch processing for multiple images
   - Add offline support with sync
   - Implement usage notifications

## Known Issues
- None currently identified

## Testing Notes
1. **Test Cases**
   - New users should start with free tier limits
   - Analysis counter should decrement with each use
   - Usage should reset at the start of new billing cycle
   - Errors should be logged but not block the user

2. **Database Verification**
   ```sql
   -- Check recent analyses
   SELECT * FROM plant_analyses 
   ORDER BY created_at DESC 
   LIMIT 5;
   
   -- Check user's current usage
   SELECT * FROM get_user_analysis_usage('user-uuid-here');
   ```

## Rollback Plan
If issues are found in production:
1. Disable the usage counter UI
2. The tracking is non-blocking, so the app will continue to function
3. Database can be rolled back if needed using Supabase's point-in-time recovery
