# Analysis Credits System

## Current Database Structure
```sql
analysis_purchases (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    quantity integer NOT NULL,         -- Number of analyses
    used_count integer DEFAULT 0,      -- Number of analyses used
    created_at timestamp DEFAULT now(),
    expires_at timestamp NOT NULL,     -- When the analyses expire
    stripe_payment_id text,            -- For tracking purchases (NULL for trial/subscription)
    purchase_type text NOT NULL,      -- 'trial', 'subscription', or 'purchase'
    -- For subscription tracking
    billing_cycle_start timestamp,     -- Start of the billing period (for subscription types)
    billing_cycle_end timestamp       -- End of the billing period (for subscription types)
);

-- Indexes for performance
CREATE INDEX idx_ap_user_active ON analysis_purchases(user_id, expires_at) 
WHERE used_count < quantity;

CREATE INDEX idx_ap_subscription ON analysis_purchases(user_id, purchase_type, billing_cycle_end) 
WHERE purchase_type = 'subscription';

CREATE INDEX idx_ap_expiring ON analysis_purchases(expires_at) 
WHERE used_count < quantity;
```

## Credit Types and Handling

### 1. Trial Credits
- **Quantity**: 5 analyses
- **Validity**: 14 days from trial start
- **purchase_type**: 'trial'
- **expires_at**: trial_start_date + 14 days
- **billing_cycle_start/end**: NULL

### 2. Subscription Credits
- **Quantity**: 20 analyses per month
- **purchase_type**: 'subscription'
- **expires_at**: End of billing cycle
- **billing_cycle_start**: Start of current billing period
- **billing_cycle_end**: End of current billing period

### 3. Purchased Credits
- **Quantity**: Variable (based on purchase)
- **purchase_type**: 'purchase'
- **expires_at**: purchase_date + 30 days
- **billing_cycle_start/end**: NULL

## Business Logic

### Credit Usage Order
1. Trial credits (if available and not expired)
2. Current subscription period credits
3. Purchased credits (oldest expiry first)

### Database Functions

#### consume_credit
```sql
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id uuid)
RETURNS TABLE (remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Implementation details as provided
$$;
```

#### get_available_credits
```sql
CREATE OR REPLACE FUNCTION public.get_available_credits(p_user_id uuid)
RETURNS TABLE (
  total_available bigint,
  trial_available bigint,
  subscription_available bigint,
  purchase_available bigint
) 
LANGUAGE sql
AS $$
  WITH trial_credits AS (
    SELECT COALESCE(SUM(quantity - used_count), 0) as total
    FROM analysis_purchases
    WHERE user_id = p_user_id 
      AND purchase_type = 'trial'
      AND used_count < quantity
      AND now() < expires_at
  ),
  subscription_credits AS (
    SELECT COALESCE(SUM(quantity - used_count), 0) as total
    FROM analysis_purchases
    WHERE user_id = p_user_id 
      AND purchase_type = 'subscription'
      AND used_count < quantity
      AND now() BETWEEN billing_cycle_start AND billing_cycle_end
  ),
  purchase_credits AS (
    SELECT COALESCE(SUM(quantity - used_count), 0) as total
    FROM analysis_purchases
    WHERE user_id = p_user_id 
      AND purchase_type = 'purchase'
      AND used_count < quantity
      AND now() < expires_at
  )
  SELECT 
    (SELECT total FROM trial_credits) + 
    (SELECT total FROM subscription_credits) + 
    (SELECT total FROM purchase_credits) as total_available,
    (SELECT total FROM trial_credits) as trial_available,
    (SELECT total FROM subscription_credits) as subscription_available,
    (SELECT total FROM purchase_credits) as purchase_available;
$$;
```

## Database Queries

**Get Available Analyses**
```sql
WITH available_credits AS (
    -- Trial credits
    SELECT id, quantity - used_count as available, 'trial' as credit_type
    FROM analysis_purchases
    WHERE 
        user_id = :userId AND
        purchase_type = 'trial' AND
        used_count < quantity AND
        now() < expires_at
    
    UNION ALL
    
    -- Current subscription period
    SELECT id, quantity - used_count as available, 'subscription' as credit_type
    FROM analysis_purchases
    WHERE 
        user_id = :userId AND
        purchase_type = 'subscription' AND
        used_count < quantity AND
        now() BETWEEN billing_cycle_start AND billing_cycle_end
    
    UNION ALL
    
    -- Purchased credits
    SELECT id, quantity - used_count as available, 'purchase' as credit_type
    FROM analysis_purchases
    WHERE 
        user_id = :userId AND
        purchase_type = 'purchase' AND
        used_count < quantity AND
        now() < expires_at
    ORDER BY expires_at ASC  -- Use oldest purchases first
)
SELECT * FROM available_credits;
```

**Consume Analysis**
1. Query for available credits (in order: trial -> subscription -> purchase)
2. Update `used_count` for the appropriate record
3. If partial usage, create a new record with remaining credits

## Implementation Notes
1. **Subscription Renewal**:
   - Create a new record for each billing cycle
   - Set `billing_cycle_start` and `billing_cycle_end` appropriately

2. **Trial Conversion**:
   - When trial ends and user subscribes, mark trial as expired
   - Create new subscription record

3. **Expiration**:
   - Run a daily job to expire old credits
   - No automatic deletion - keep for historical reporting

## Edge Cases
- **Concurrent Usage**: Use row-level locking when updating `used_count`
- **Timezones**: Store all dates in UTC
- **Partial Usage**: Handle cases where a record is partially used
- **Failed Payments**: Track and handle failed subscription renewals

## Monitoring
- Track usage patterns
- Monitor credit expiration
- Alert on unusual usage patterns

## Testing the Credit System

### 1. Test Data Setup

```sql
-- Create a test user (if not exists)
INSERT INTO auth.users (id, email, created_at, updated_at) 
VALUES ('11111111-1111-4111-8111-111111111111', 'test@example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add test credits
WITH new_credits AS (
  INSERT INTO analysis_purchases 
    (id, user_id, quantity, used_count, purchase_type, expires_at, created_at)
  VALUES 
    -- Trial credits (5 available)
    (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 5, 0, 'trial', now() + interval '14 days', now()),
    -- Subscription credits (10 available)
    (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 10, 0, 'subscription', now() + interval '30 days', now())
  RETURNING *
)
SELECT * FROM new_credits;
```

### 2. Test Credit Consumption

```sql
-- Check available credits before
SELECT * FROM get_available_credits('11111111-1111-4111-8111-111111111111');

-- Consume 1 credit
SELECT * FROM consume_credit('11111111-1111-4111-8111-111111111111');

-- Verify remaining credits
SELECT * FROM get_available_credits('11111111-1111-4111-8111-111111111111');

-- View detailed credit usage
SELECT 
  id, 
  purchase_type, 
  quantity, 
  used_count, 
  quantity - used_count as remaining,
  expires_at
FROM analysis_purchases 
WHERE user_id = '11111111-1111-4111-8111-111111111111';
```

### 3. Test Edge Cases

```sql
-- Test with no available credits
SELECT * FROM consume_credit('non-existent-user-id');

-- Test with expired credits
UPDATE analysis_purchases 
SET expires_at = now() - interval '1 day'
WHERE user_id = '11111111-1111-4111-8111-111111111111';

-- Verify no credits are available
SELECT * FROM get_available_credits('11111111-1111-4111-8111-111111111111');
```

## Client-Side Utilities

### Available in `lib/analysisCredits.js`

#### 1. Get Available Credits
```javascript
import { getAvailableCredits } from '../lib/analysisCredits';

// Get available credits
const credits = await getAvailableCredits(userId);
// Returns: { total: number, trial: number, subscription: number, purchase: number }
```

#### 2. Use an Analysis
```javascript
import { useAnalysis } from '../lib/analysisCredits';

// Use one analysis credit
const result = await useAnalysis(userId);
// Returns: { success: boolean, remaining: number, error?: string }
```

#### 3. Create Trial
```javascript
import { createTrial } from '../lib/analysisCredits';

// Create trial for new user
const result = await createTrial(userId);
// Returns: { success: boolean, error?: string }
```

#### 4. Check Subscription Status
```javascript
import { hasActiveSubscription } from '../lib/analysisCredits';

// Check if user has active subscription
const isSubscribed = await hasActiveSubscription(userId);
// Returns: boolean
```

## Server-Side Functions

### Database Functions
1. `get_available_credits(user_id)` - Get available credits
2. `consume_credit(user_id, quantity)` - Use credits
3. `renew_subscription_credits(user_id)` - Renew subscription

### Webhook Handlers
1. `analyses-purchase` - Handle new analysis purchases
2. `analyses-purchase-webhook` - Process Stripe webhook events

## Implementation Progress

### Completed

1. **Profile Page Integration**
   - Updated the profile page to use the utility functions `getAvailableCredits` and `hasActiveSubscription`
   - Simplified the subscription and credit display logic
   - Added proper error handling and loading states

2. **Utility Functions**
   - Implemented `getAvailableCredits` to fetch user's available credits
   - Implemented `hasActiveSubscription` to check subscription status
   - Added proper error handling and type checking

3. **Database Integration**
   - Set up proper indexes for performance
   - Implemented credit consumption logic with transaction support
   - Added subscription status tracking

### Next Steps

1. **Testing**
   - [ ] Unit tests for credit calculation logic
   - [ ] Integration tests for the complete flow (purchase -> consume -> renew)
   - [ ] End-to-end tests for the profile page and credit display

2. **Monitoring and Logging**
   - [ ] Set up logging for credit-related operations
   - [ ] Create dashboards to monitor credit usage and expiration
   - [ ] Set up alerts for unusual patterns

3. **Documentation**
   - [ ] Update API documentation for the utility functions
   - [ ] Add usage examples for common scenarios
   - [ ] Document error handling patterns

4. **Performance Optimization**
   - [ ] Add caching for frequently accessed credit data
   - [ ] Optimize database queries for credit calculations
   - [ ] Implement batch processing for credit expiration

## Known Issues

1. **Time Zone Handling**
   - Currently using server time for all date comparisons
   - Need to implement proper timezone support for accurate billing cycles

2. **Concurrency**
   - Race conditions possible when multiple operations update credit counts
   - Need to implement proper locking mechanisms

3. **Error Recovery**
   - Need to add retry logic for failed transactions
   - Implement better error messages for end users
- Load testing for concurrent credit consumption

## Future Considerations
1. Prorated refunds for purchased credits
2. Different subscription tiers
3. Gift credits to other users
4. Promotional credits
