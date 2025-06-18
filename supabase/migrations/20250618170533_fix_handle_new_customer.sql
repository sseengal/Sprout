-- Add unique constraint to user_id in customers table
ALTER TABLE public.customers 
ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);

-- Update handle_new_customer function to use valid plan_type
CREATE OR REPLACE FUNCTION public.handle_new_customer(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  user_phone text;
  user_metadata jsonb;
  new_customer_id uuid;
BEGIN
  -- Get user details
  SELECT 
    u.email,
    u.phone,
    u.raw_user_meta_data
  INTO 
    user_email,
    user_phone,
    user_metadata
  FROM auth.users u
  WHERE u.id = p_user_id;
  
  -- Insert or update customer record
  INSERT INTO public.customers (
    user_id,
    email,
    name,
    phone,
    subscription_status,
    plan_type,
    billing_interval,
    address,
    metadata,
    cancel_at_period_end
  ) VALUES (
    p_user_id,
    user_email,
    COALESCE(user_metadata->>'name', split_part(user_email, '@', 1), 'User'),
    COALESCE(user_phone, ''),
    'inactive',
    'monthly',  -- Changed from 'free' to 'monthly' to satisfy plan_type_check
    'month',
    '{}'::jsonb,
    COALESCE(user_metadata, '{}'::jsonb),
    false
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    updated_at = NOW()
  RETURNING id INTO new_customer_id;
  
  RETURN json_build_object(
    'status', 'success',
    'customer_id', new_customer_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'status', 'error',
    'message', SQLERRM,
    'detail', SQLSTATE
  );
END;
$function$;
