# Stripe Webhook and Customer Table Documentation

## Table of Contents
1. [Customer Table Schema](#customer-table-schema)
2. [Constraints](#constraints)
3. [Webhook Event Handlers](#webhook-event-handlers)
4. [Change Log](#change-log)

## Customer Table Schema

### Columns

| Column Name | Data Type | Nullable | Default | Description |
|-------------|------------------------|----------|--------------------------------|-------------------------------------------------|
| id | uuid | NO | uuid_generate_v4() | Primary key |
| user_id | uuid | NO | - | Foreign key to auth.users |
| updated_at | timestamptz | NO | now() | Last update timestamp |
| next_billing_date | timestamptz | YES | - | Next billing date |
| last_payment_date | timestamptz | YES | - | Date of last payment |
| last_payment_amount | integer | YES | - | Amount of last payment |
| trial_start_date | timestamptz | YES | - | Start of trial period |
| trial_end_date | timestamptz | YES | - | End of trial period |
| subscription_start_date | timestamptz | YES | - | Start of subscription |
| subscription_end_date | timestamptz | YES | - | End of subscription |
| cancel_at_period_end | boolean | YES | false | Whether to cancel at period end |
| address | jsonb | YES | - | Billing address |
| metadata | jsonb | YES | '{}'::jsonb | Additional metadata |
| created_at | timestamptz | NO | now() | Creation timestamp |
| stripe_customer_id | text | YES | - | Stripe customer ID |
| email | text | NO | - | Customer email |
| name | text | YES | - | Customer name |
| phone | text | YES | - | Customer phone |
| subscription_status | text | NO | 'inactive' | Status of subscription |
| stripe_subscription_id | text | YES | - | Stripe subscription ID |
| default_payment_method | text | YES | - | Default payment method ID |
| plan_type | text | NO | - | Type of plan |
| billing_interval | text | NO | - | Billing interval |
| last_payment_status | text | YES | - | Status of last payment |
| is_lifetime | boolean | NO | false | Whether the user has lifetime access |
| lifetime_purchased_at | timestamptz | YES | - | When lifetime access was purchased |
| lifetime_expires_at | timestamptz | YES | - | When lifetime access expires (future use) |

### Required Fields
- `id` (auto-generated)
- `user_id` (from auth.users)
- `email`
- `subscription_status` (default: 'inactive')
- `plan_type`
- `billing_interval`
- `created_at` (auto-generated)
- `updated_at` (auto-updated)

## Constraints

### Primary Key
- `customers_pkey` on column `id`

### Foreign Keys
- `customers_user_id_fkey` references `auth.users(id)`

### Unique Constraints
- `customers_user_id_key` on column `user_id`

### Check Constraints
1. `billing_interval_check` on column `billing_interval`
   - Allowed values: `['month', 'year']`

2. `plan_type_check` on column `plan_type`
   - Allowed values: `['free', 'monthly', 'yearly', 'lifetime']`

3. `subscription_status_check` on column `subscription_status`
   - Allowed values: `['inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid']`

4. Not Null Constraints (unnamed):
   - `2200_23211_1_not_null` - Column: TBD
   - `2200_23211_2_not_null` - Column: TBD
   - `2200_23211_4_not_null` - Column: TBD
   - `2200_23211_10_not_null` through `2200_23211_14_not_null` - Columns: TBD

## Field Ownership

### Auth Flow (handle_new_customer)
The following fields are managed during user signup via the `handle_new_customer` function:

```sql
INSERT INTO public.customers (
  user_id,         -- From auth.users.id
  email,           -- From auth.users.email
  name,            -- From metadata or email prefix
  phone,           -- From auth.users.phone
  subscription_status,  -- Hardcoded 'inactive'
  plan_type,            -- Hardcoded 'monthly'
  billing_interval,     -- Hardcoded 'month'
  address,              -- Empty JSONB
  metadata,             -- From auth.users.raw_user_meta_data
  cancel_at_period_end  -- Hardcoded false
)
```

On conflict (user_id), it updates:
- email
- name
- phone
- updated_at

### Webhook-Only Fields
These fields should only be updated by Stripe webhooks:
- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status` (after initial 'inactive')
- `plan_type` (after initial 'monthly')
- `billing_interval` (after initial 'month')
- `next_billing_date`
- `last_payment_date`
- `last_payment_amount`
- `trial_start_date`
- `trial_end_date`
- `subscription_start_date`
- `subscription_end_date`
- `cancel_at_period_end`
- `default_payment_method`
- `last_payment_status`
- `is_lifetime`
- `lifetime_purchased_at`
- `lifetime_expires_at`

### Shared Fields
These fields can be updated by both flows:
- `updated_at` (auto-updated by both)
- `metadata` (should be merged, not overwritten)
- `address` (should be updated by user action, not webhook)

## Webhook Event Handlers

### Payment Intent Events
- `payment_intent.created`
  - Updates: last_payment_date, last_payment_amount, last_payment_status
  
- `payment_intent.succeeded`
  - Updates: last_payment_date, last_payment_amount, last_payment_status

### Subscription Events
- `customer.subscription.created`
  - Sets: subscription_status, plan_type, billing_interval, trial dates
  
- `customer.subscription.updated`
  - Updates: subscription_status, plan details, billing dates
  
- `customer.subscription.deleted`
  - Updates: subscription_status to 'canceled', subscription_end_date

### Customer Events
- `customer.created`
  - Creates: Basic customer record with Stripe ID
  
- `customer.updated`
  - Updates: stripe_customer_id, default_payment_method

### Invoice Events
- `invoice.payment_succeeded`
  - Updates: last_payment_*, subscription status, next_billing_date
  
- `invoice.payment_failed`
  - Updates: last_payment_status, subscription_status (to 'past_due')

## Required Changes to Webhook

1. **Customer Events** (`customer.created/updated`):
   - Remove updates to: email, name, phone
   - Only update: stripe_customer_id, default_payment_method

2. **Payment Events** (`payment_intent.*`):
   - Keep payment-related updates
   - Ensure no customer profile updates

3. **Subscription/Invoice Events**:
   - These look correct - they only update subscription-related fields

4. **Conflict Resolution**:
   - Add logic to merge metadata instead of overwriting
   - Preserve auth-managed fields during webhook updates

## Change Log

### 2025-06-18
- Initial documentation created
- Added complete table schema and constraints
- Documented `handle_new_customer` function behavior
- Analyzed field ownership between auth flow and webhooks
- Outlined required webhook handler changes
