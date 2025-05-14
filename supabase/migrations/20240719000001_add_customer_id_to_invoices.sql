-- Add customer_id column to invoices table if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Add foreign key constraint to link invoices to customers
ALTER TABLE invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES customers(id)
  ON DELETE SET NULL;
