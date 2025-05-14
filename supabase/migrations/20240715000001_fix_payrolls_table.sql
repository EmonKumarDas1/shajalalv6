-- Check if payrolls table exists, if not create it
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  amount DECIMAL(10, 2) NOT NULL,
  period VARCHAR(50) DEFAULT 'Monthly',
  status VARCHAR(50) DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if the table is already in the publication before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payrolls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payrolls;
  END IF;
END
$$;