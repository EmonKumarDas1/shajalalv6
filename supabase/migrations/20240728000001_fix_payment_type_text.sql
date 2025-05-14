-- Ensure payment_type is TEXT in payrolls table
ALTER TABLE payrolls ALTER COLUMN payment_type TYPE TEXT;

-- Ensure payment_type is TEXT in salary_payments table
ALTER TABLE salary_payments ALTER COLUMN payment_type TYPE TEXT;
