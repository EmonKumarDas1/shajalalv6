-- Drop and recreate foreign key constraints for invoices table
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_supplier_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_shop_id_fkey;

-- Ensure columns exist with correct types
ALTER TABLE invoices ALTER COLUMN supplier_id TYPE UUID USING supplier_id::UUID;
ALTER TABLE invoices ALTER COLUMN shop_id TYPE UUID USING shop_id::UUID;

-- Recreate foreign key constraints
ALTER TABLE invoices ADD CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
ALTER TABLE invoices ADD CONSTRAINT invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id);

-- Create payments table for tracking later payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Refresh schema cache
COMMENT ON TABLE invoices IS 'Invoices for product purchases';
COMMENT ON TABLE payments IS 'Payment records for invoices';
