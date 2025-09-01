#!/bin/bash
# Ensure database is properly initialized on every deployment
# This script runs the production migration to create/update all necessary tables

echo "[DB] Ensuring database tables exist..."

# Wait for PostgreSQL to be ready
until pg_isready -h ${DATABASE_HOST:-localhost} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-chess_user} 2>/dev/null; do
  echo "[DB] Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "[DB] PostgreSQL is ready. Running migrations..."

# Extract connection details from DATABASE_URL if available
if [ -n "$DATABASE_URL" ]; then
  # Parse DATABASE_URL
  # Format: postgresql://user:password@host:port/database
  export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  export PGUSER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  export PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  export PGPORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  export PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
fi

# Run the migration script
echo "[DB] Applying production migration..."
psql -f /app/server/db/production-migration.sql 2>&1 | while IFS= read -r line; do
  # Filter out NOTICE messages about existing objects
  if [[ ! "$line" =~ "already exists, skipping" ]] && [[ ! "$line" =~ "NOTICE:" ]]; then
    echo "$line"
  fi
done

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "[DB] ✅ Database migration completed successfully"
else
  echo "[DB] ❌ Database migration failed"
  exit 1
fi

echo "[DB] Database initialization complete"