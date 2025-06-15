-- Migration to add Stripe support to existing payment tables

-- Add Stripe columns to subscriptions table
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Add Stripe columns to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON public.payments(stripe_invoice_id);

-- Update subscriptions status enum to include Stripe statuses
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN (
    'active', 'canceled', 'expired', 'trialing', 'past_due', 
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  ));

-- Update payments status enum to include Stripe statuses
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN (
    'created', 'authorized', 'captured', 'refunded', 'failed',
    'processing', 'requires_payment_method', 'requires_confirmation',
    'requires_action', 'canceled', 'succeeded'
  ));

-- Add comments to document the new columns
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether the subscription is set to cancel at period end';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'End of the current period for the subscription';
COMMENT ON COLUMN public.subscriptions.price_id IS 'Stripe price ID for the subscription';

COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS 'Stripe payment intent ID';
COMMENT ON COLUMN public.payments.stripe_invoice_id IS 'Stripe invoice ID';
COMMENT ON COLUMN public.payments.failure_reason IS 'Reason for payment failure if applicable';
