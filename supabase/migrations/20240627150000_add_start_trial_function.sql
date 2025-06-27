-- Create start_trial function
CREATE OR REPLACE FUNCTION public.start_trial(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_record_id uuid;
  v_has_active_trial boolean;
  v_customer_exists boolean;
  v_trial_credits int := 5; -- 5 free analyses
  v_trial_days int := 14;   -- 14 days trial
  v_trial_end timestamptz := (now() + (v_trial_days * interval '1 day'));
  v_trial_start timestamptz := now();
BEGIN
  -- Check if user exists in customers table
  SELECT EXISTS (SELECT 1 FROM customers WHERE id = p_user_id) INTO v_customer_exists;
  
  IF NOT v_customer_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Customer record not found.'
    );
  END IF;

  -- Check if user already has an active or used trial in analysis_purchases
  SELECT EXISTS (
    SELECT 1 
    FROM analysis_purchases 
    WHERE user_id = p_user_id 
    AND purchase_type = 'trial'
    AND (used_count < quantity OR now() < COALESCE(expires_at, 'infinity'::timestamptz))
  ) INTO v_has_active_trial;

  -- Also check if trial is active in customers table
  IF NOT v_has_active_trial THEN
    SELECT EXISTS (
      SELECT 1 
      FROM customers 
      WHERE id = p_user_id 
      AND trial_end_date IS NOT NULL 
      AND trial_end_date > now()
    ) INTO v_has_active_trial;
  END IF;

  IF v_has_active_trial THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already have an active or used trial.'
    );
  END IF;

  -- Begin transaction
  BEGIN
    -- Create trial record in analysis_purchases
    INSERT INTO analysis_purchases (
      id, 
      user_id, 
      quantity, 
      used_count, 
      purchase_type,
      created_at,
      expires_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      v_trial_credits,
      0,
      'trial',
      v_trial_start,
      v_trial_end
    )
    RETURNING id INTO v_trial_record_id;

    -- Update customer's trial information
    UPDATE customers 
    SET 
      trial_start_date = v_trial_start,
      trial_end_date = v_trial_end,
      plan_type = 'trial',
      subscription_status = 'trialing',
      updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'trial_id', v_trial_record_id,
      'credits', v_trial_credits,
      'start_date', v_trial_start,
      'end_date', v_trial_end,
      'message', 'Trial started successfully with ' || v_trial_credits || ' free analyses.'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to start trial.'
    );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.start_trial TO authenticated;
