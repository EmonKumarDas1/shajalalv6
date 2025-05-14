-- Check if the token_identifier column exists in the users table, and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'token_identifier') THEN
        ALTER TABLE public.users ADD COLUMN token_identifier TEXT;
    END IF;
END
$$;

-- Ensure admin user exists in public.users table
INSERT INTO public.users (id, email, full_name, created_at, token_identifier)
VALUES ('admin-user-id', 'admin@example.com', 'Admin User', NOW(), 'admin-token')
ON CONFLICT (id) DO UPDATE
SET email = 'admin@example.com',
    full_name = 'Admin User',
    token_identifier = 'admin-token';
