-- Check if the admin user already exists in the public.users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@example.com') THEN
    -- Insert the admin user if it doesn't exist
    INSERT INTO public.users (id, email, full_name, role, created_at, token_identifier)
    VALUES (
      '38f39d8f-8c7a-4ad2-9f9a-be3f19e9a5e2', -- Fixed UUID for admin
      'admin@example.com',
      'Admin User',
      'admin',
      NOW(),
      'admin-token'
    );
    
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END
$$;