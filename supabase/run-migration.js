// Script to run migrations with proper credentials
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Get the migration file path from command line arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error("Please provide a migration file path");
  process.exit(1);
}

// Read the SQL file
const sqlContent = fs.readFileSync(path.resolve(migrationFile), "utf8");

// Create Supabase client using environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials not found in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log(`Running migration: ${migrationFile}`);

    // Execute the SQL query
    const { error } = await supabase.rpc("exec_sql", { query: sqlContent });

    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }

    console.log("Migration completed successfully");
  } catch (err) {
    console.error("Error running migration:", err);
    process.exit(1);
  }
}

runMigration();
