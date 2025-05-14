-- Check if employees table is already in the publication before adding it
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

-- Add profile_image column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE employees ADD COLUMN profile_image TEXT;
  END IF;
END
$$;
