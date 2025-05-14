-- Create others_costs table if it doesn't exist
CREATE TABLE IF NOT EXISTS others_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
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
    AND tablename = 'others_costs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE others_costs;
  END IF;
END
$$;
