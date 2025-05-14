#!/bin/bash

# Check if a migration file is provided
if [ -z "$1" ]; then
  echo "Please provide a migration file path"
  exit 1
fi

# Run the migration using the Node.js script
node --experimental-modules supabase/run-migration.js "$1"
