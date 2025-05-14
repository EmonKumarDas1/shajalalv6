CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  buying_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  watt INTEGER,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_unique_idx ON products (name, supplier_id, watt, buying_price);

DROP POLICY IF EXISTS "Public suppliers access" ON suppliers;
CREATE POLICY "Public suppliers access"
ON suppliers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Auth suppliers insert" ON suppliers;
CREATE POLICY "Auth suppliers insert"
ON suppliers FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Auth suppliers update" ON suppliers;
CREATE POLICY "Auth suppliers update"
ON suppliers FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Auth suppliers delete" ON suppliers;
CREATE POLICY "Auth suppliers delete"
ON suppliers FOR DELETE
USING (true);

DROP POLICY IF EXISTS "Public products access" ON products;
CREATE POLICY "Public products access"
ON products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Auth products insert" ON products;
CREATE POLICY "Auth products insert"
ON products FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Auth products update" ON products;
CREATE POLICY "Auth products update"
ON products FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Auth products delete" ON products;
CREATE POLICY "Auth products delete"
ON products FOR DELETE
USING (true);

alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table products;