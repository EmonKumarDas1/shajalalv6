-- Add product_name column to invoice_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoice_items' 
                 AND column_name = 'product_name') THEN
    ALTER TABLE invoice_items ADD COLUMN product_name TEXT;
  END IF;
END $$;

-- Enable realtime for invoice_items
alter publication supabase_realtime add table invoice_items;
