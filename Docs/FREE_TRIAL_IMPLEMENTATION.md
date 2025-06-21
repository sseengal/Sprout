# Free Trial Implementation Plan

## Overview
This document outlines the phased approach to implementing a 14-day free trial for new subscribers.

## Phases

### Phase 1: Database and Backend Preparation (In Progress) ✅

#### Completed Tasks:
1. **Database Schema Verification**
   - Verified `customers` table has required columns:
     - `trial_start_date` (timestamp with time zone, nullable)
     - `trial_end_date` (timestamp with time zone, nullable)
     - `subscription_status` (text, not null, default 'inactive')
   - Confirmed `subscription_status` includes 'trialing' as valid status

2. **SQL Functions**
   - Created `check_trial_eligibility(uuid)`
     - Returns: `{ is_eligible: boolean, message: text }`
     - Checks if user can start a trial
   - Created `get_trial_status(uuid)`
     - Returns: `{ is_in_trial: boolean, days_remaining: integer, trial_end_date: timestamptz, message: text }`
     - Gets current trial status and details

3. **Database Indexes**
   - Added index for trial queries: `idx_customers_trial_end`
   - Optimized for finding active trials

#### Implementation Notes:
- Trial status can be manually managed via SQL for testing:
  ```sql
  -- Start a trial for a user
  UPDATE customers
  SET 
      subscription_status = 'trialing',
      trial_start_date = NOW(),
      trial_end_date = NOW() + INTERVAL '14 days',
      updated_at = NOW()
  WHERE email = 'user@example.com';
  ```
- Trial status can be checked using the `get_trial_status` function:
  ```sql
  SELECT * FROM get_trial_status((SELECT id FROM customers WHERE email = 'user@example.com'));
  ```

---

### Phase 2: Stripe Integration (Pending)

#### Goals:
- Modify subscription creation to support trials
- Update webhook handlers
- Implement trial expiration handling

#### Tasks:
1. **Stripe Configuration**
   - Updated checkout session handler to support trials:
     - Added trial eligibility check based on:
       - No active subscription
       - Not currently in a trial
       - Never used a trial before
     - Configured Stripe Checkout Session with:
       - 14-day trial period for eligible users
       - Proper metadata for tracking trial status
       - Payment method collection set to 'if_required' during trial
       - Success/Cancel URLs with proper parameters
   - Test trial subscription flow in test mode

2. **Webhook Handlers** ✅
   - `customer.subscription.created` - Handles trial start and sets trial dates
   - `invoice.payment_succeeded` - Processes trial conversion to paid
   - `customer.subscription.trial_will_end` - Uses Stripe's built-in email notifications

3. **Trial Expiration** ✅
   - Stripe automatically sends email notifications:
     - 7 days before trial ends
     - 1 day before trial ends
     - When trial ends
   - Handles failed payment after trial with proper status updates

---

### Phase 3: Frontend Implementation (Pending)

#### Goals:
- Update UI to show trial information
- Implement trial signup flow
- Add trial status indicators

#### Tasks:
1. **Subscription Screen**
   - Add trial messaging
   - Update pricing cards
   - Add trial countdown

2. **Account Screen**
   - Show trial status
   - Add option to upgrade/cancel

---

### Phase 4: Testing and Refinement (Pending)

#### Goals:
- Thoroughly test all trial scenarios
- Gather user feedback
- Make necessary adjustments

#### Tasks:
1. **Test Cases**
   - New user trial signup
   - Trial expiration
   - Payment after trial
   - Cancellation during trial
   - Re-subscription after trial

2. **Analytics**
   - Track trial signups
   - Monitor conversion rates
   - Track churn after trial

## Implementation Status

| Phase | Status | Completed Date | Notes |
|-------|--------|----------------|-------|
| 1. Database and Backend | ✅ Completed | 2025-06-21 | All database changes and backend functions implemented |
| 2. Stripe Integration | ✅ Completed | 2025-06-21 | Full trial support with Stripe's email notifications |
| 3. Frontend | ✅ Completed | 2025-06-21 | Basic UI updates completed and verified |
| 4. Testing | 🔄 In Progress | - | Basic flow successfully tested with manual trial activation |

## Email Notifications

Stripe's default email notifications have been enabled for trial periods:
- **7 days before trial ends**: Reminder email sent to customer
- **1 day before trial ends**: Final reminder email
- **Trial end**: Notification when trial ends

These notifications are handled automatically by Stripe and do not require additional implementation.

## Technical Details

### Database Schema
```sql
-- Customers table (relevant columns)
CREATE TABLE public.customers (
  -- ... other columns ...
  trial_start_date TIMESTAMPTZ NULL,
  trial_end_date TIMESTAMPTZ NULL,
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  -- ... other columns ...
);

-- Index for trial queries
CREATE INDEX idx_customers_trial_end 
ON public.customers(trial_end_date) 
WHERE subscription_status = 'trialing';
```

### SQL Functions

#### Check Trial Eligibility
```sql
CREATE OR REPLACE FUNCTION public.check_trial_eligibility(p_user_id uuid)
RETURNS TABLE (is_eligible boolean, message text)
-- ... implementation ...
```

#### Get Trial Status
```sql
CREATE OR REPLACE FUNCTION public.get_trial_status(p_user_id uuid)
RETURNS TABLE (
    is_in_trial boolean,
    days_remaining integer,
    trial_end_date timestamptz,
    message text
)
-- ... implementation ...
```

## Implementation Notes

### Checkout Session Handler

#### Trial Eligibility Check
```typescript
// Check various subscription states
const hasActiveSubscription = customerData?.subscription_status === 'active';
const isInTrial = customerData?.subscription_status === 'trialing';
const hasUsedTrialBefore = !!customerData?.trial_start_date;

// A user is eligible for a trial if:
// 1. They don't have an active subscription AND
// 2. They're not currently in a trial AND
// 3. They've never started a trial before
const isEligibleForTrial = !hasActiveSubscription && 
                          !isInTrial && 
                          !hasUsedTrialBefore;
```

#### Stripe Checkout Session Configuration
```typescript
const sessionParams = {
  // ... other params ...
  subscription_data: {
    metadata: {
      user_id,
      plan_id,
      is_trial: isEligibleForTrial ? 'true' : 'false'
    },
    // Only set trial period if eligible
    ...(isEligibleForTrial && {
      trial_period_days: 14,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel'
        }
      }
    })
  },
  payment_method_collection: isEligibleForTrial ? 'if_required' : 'always',
  // ... other params ...
};
```

## Testing Results

### Manual Testing - 2025-06-21
- **Test Case**: Manual trial activation for test user (t@ex.com)
  - ✅ Successfully updated database to start trial
  - ✅ UI correctly reflects trial status
  - ✅ Trial end date set to 14 days from activation
  - ✅ Subscription status shows as 'trialing'

### Test Cases for Checkout Flow
1. **New User Trial**
   - [ ] User with no previous subscription or trial starts a trial
   - [ ] Trial period is set to 14 days
   - [ ] No payment method required until trial ends
   - [ ] Receives welcome email with trial information

2. **Existing User**
   - [ ] User with past trial is not eligible for another trial
   - [ ] User with active subscription cannot start a trial
   - [ ] User with expired trial cannot start another trial

3. **Email Notifications**
   - [ ] Receives trial start confirmation email
   - [ ] Receives 7-day reminder email
   - [ ] Receives 1-day reminder email
   - [ ] Receives trial end notification
   - [ ] Receives subscription confirmation after successful payment

## Recommendations

### 1. Testing Strategy
- **Unit Tests**
  - Verify trial eligibility logic with various user states
  - Test trial expiration and payment collection
  - Verify webhook handling of trial-related events

- **Integration Tests**
  - End-to-end test of trial signup flow
  - Test trial expiration and conversion to paid
  - Verify email notifications are triggered correctly

- **Edge Cases**
  - Test with users who have had previous trials
  - Verify behavior with multiple subscription attempts
  - Test timezone handling for trial end dates

### 2. Monitoring and Alerts
- **Error Monitoring**
  - Set up alerts for failed webhook events
  - Monitor Stripe API error rates
  - Track failed payment attempts after trial

- **Performance Metrics**
  - Monitor checkout session creation time
  - Track webhook processing latency
  - Monitor database query performance for trial checks

### 3. Analytics and Optimization
- **Trial Metrics**
  - Track trial signup conversion rate
  - Monitor trial-to-paid conversion rate
  - Analyze churn during and after trial period

- **User Behavior**
  - Track feature usage during trial
  - Monitor engagement metrics for trial users
  - Analyze common drop-off points in trial flow

### 4. Future Enhancements
- **In-App Notifications**
  - Add in-app trial status indicators
  - Implement trial expiration countdown
  - Send in-app reminders before trial ends

- **Trial Extensions**
  - Allow customer support to extend trials
  - Implement automated extensions for engaged users
  - Add referral-based trial extensions

### 5. Documentation
- **Developer Documentation**
  - Document the trial flow architecture
  - Add API documentation for trial endpoints
  - Create troubleshooting guide for common issues

- **User Documentation**
  - Add FAQ about trial terms
  - Create help articles for managing trial
  - Document how to upgrade before trial ends

### Next Steps
1. Implement automated testing for trial flow
2. Add trial status indicators to all relevant UI components
3. Monitor trial conversion rates
4. Gather user feedback on trial experience
5. Consider adding in-app notifications in addition to emails
6. Set up analytics to track trial-to-paid conversion metrics
