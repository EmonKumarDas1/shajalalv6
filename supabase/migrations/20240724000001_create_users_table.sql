CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  full_name VARCHAR,
  email VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert default admin user
INSERT INTO users (name, password, full_name, email)
VALUES ('admin', 'admin123', 'System Administrator', 'admin@example.com');

-- Insert some sample users
INSERT INTO users (name, password, full_name, email)
VALUES 
  ('john', 'john123', 'John Smith', 'john@example.com'),
  ('jane', 'jane123', 'Jane Doe', 'jane@example.com'),
  ('bob', 'bob123', 'Bob Wilson', 'bob@example.com');

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Enable realtime
alter publication supabase_realtime add table users;