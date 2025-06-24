# Lifetime Pricing Implementation

## Overview
This document tracks the implementation of the lifetime pricing option for Sprout.

## Implementation Status

### Phase 1: Stripe Setup ✅
- [x] Created "Sprout Lifetime Access" product in Stripe Dashboard
- [x] Set as one-time purchase (not subscription)
- [x] Price: $149.99
- [x] Added to environment variables:
  - `EXPO_PUBLIC_STRIPE_LIFETIME_PRICE_ID=price_xxxxxxxxxxxxxxxx`

### Phase 2: Backend Updates

#### 2.1 Database Schema Updates
- [ ] Add columns to `subscriptions` table:
  - `is_lifetime` (boolean, default: false)
  - `lifetime_purchased_at` (timestamp, nullable)
  - `lifetime_expires_at` (timestamp, nullable, for future flexibility)

#### 2.2 Webhook Handler Updates
- [ ] Update `stripe-webhook-public/index.ts` to handle `checkout.session.completed` for lifetime purchases
- [ ] Add logic to:
  - Identify lifetime purchases by price ID
  - Update user's subscription record
  - Set `is_lifetime = true`
  - Set `lifetime_purchased_at = now()`

#### 2.3 API Endpoints
- [ ] Update subscription status check to verify lifetime access
- [ ] Add endpoint to fetch lifetime purchase status
- [ ] Update any existing subscription validation logic

### Phase 3: Frontend Updates
- [ ] Update pricing page
- [ ] Add checkout flow
- [ ] Update subscription status display

### Phase 4: Testing
- [ ] Test purchases
- [ ] Verify access
- [ ] Test edge cases

### Phase 5: Deployment
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Monitor
