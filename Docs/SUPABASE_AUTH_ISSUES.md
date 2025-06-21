# Supabase Auth Issues and Solutions

## Issue: Database Error When Logging In

### Symptoms
- Error when trying to log in: `Database error querying schema`
- Auth logs show: `error finding user: sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported`
- User exists in the database but cannot log in

### Root Cause
- The `confirmation_token` column in `auth.users` was `NULL` for a confirmed user
- Supabase's Go auth server has issues handling NULL values in the `confirmation_token` column, even though the column is nullable

### Solution
For affected users, set a dummy confirmation token:

```sql
-- For a specific user
UPDATE auth.users 
SET 
    confirmation_token = 'dummy-confirmed-' || gen_random_uuid(),
    updated_at = now()
WHERE 
    email = 'user@example.com';

-- For all users with NULL confirmation tokens
UPDATE auth.users 
SET 
    confirmation_token = 'dummy-confirmed-' || gen_random_uuid(),
    updated_at = now()
WHERE 
    confirmation_token IS NULL
    AND email_confirmed_at IS NOT NULL;
```

### Prevention
When creating new users programmatically, always provide a non-NULL `confirmation_token` even for confirmed users:

```sql
INSERT INTO auth.users (
    id, 
    instance_id, 
    aud, 
    role, 
    email, 
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'newuser@example.com',
    crypt('password123', gen_salt('bf', 10)),
    now(),  -- User is immediately confirmed
    'dummy-confirmed-' || gen_random_uuid(),  -- Non-NULL token for confirmed user
    now(),
    now()
);
```

### Notes
- This issue was encountered with Supabase's authentication system
- The workaround is safe as the `confirmation_token` is not used after email confirmation
- Keep an eye on future Supabase updates that might fix this behavior
