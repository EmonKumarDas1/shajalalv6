-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  hire_date TIMESTAMP WITH TIME ZONE,
  salary NUMERIC,
  status TEXT DEFAULT 'active',
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Check if the table is already in the publication before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'employees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE employees;
  END IF;
END
$$;
