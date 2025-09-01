#!/bin/bash
# Ensure database is properly initialized on every deployment
# This script runs the production migration to create/update all necessary tables

echo "[DB] Ensuring database tables exist..."

# Extract connection details from DATABASE_URL if available
if [ -n "$DATABASE_URL" ]; then
  # Parse DATABASE_URL
  # Format: postgresql://user:password@host:port/database?params
  # First remove any query parameters
  DB_URL_NO_PARAMS=$(echo $DATABASE_URL | sed 's/\?.*//')
  
  # Extract components
  export PGUSER=$(echo $DB_URL_NO_PARAMS | sed -n 's|.*://\([^:]*\):.*@.*|\1|p')
  export PGPASSWORD=$(echo $DB_URL_NO_PARAMS | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  export PGHOST=$(echo $DB_URL_NO_PARAMS | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
  export PGPORT=$(echo $DB_URL_NO_PARAMS | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
  export PGDATABASE=$(echo $DB_URL_NO_PARAMS | sed -n 's|.*/\([^/?]*\)$|\1|p')
  
  # If port is not found (e.g., using default port), set it to 5432
  if [ -z "$PGPORT" ]; then
    export PGPORT=5432
  fi
  
  # Debug output to verify parsing
  echo "[DB] Parsed connection details from DATABASE_URL:"
  echo "[DB]   Host: $PGHOST"
  echo "[DB]   Port: $PGPORT"
  echo "[DB]   User: $PGUSER"
  echo "[DB]   Database: $PGDATABASE"
else
  # Fall back to individual environment variables
  export PGHOST=${DATABASE_HOST:-localhost}
  export PGPORT=${DATABASE_PORT:-5432}
  export PGUSER=${DATABASE_USER:-chess_user}
  export PGDATABASE=${DATABASE_NAME:-chess_db}
  
  echo "[DB] Using environment variables:"
  echo "[DB]   Host: $PGHOST"
  echo "[DB]   Port: $PGPORT"
  echo "[DB]   User: $PGUSER"
  echo "[DB]   Database: $PGDATABASE"
fi

# Wait for PostgreSQL to be ready using parsed values
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" 2>/dev/null; do
  echo "[DB] Waiting for PostgreSQL to be ready at $PGHOST:$PGPORT..."
  sleep 2
done

echo "[DB] PostgreSQL is ready. Running migrations..."

# Run the migration script using the connection parameters
echo "[DB] Applying production migration..."
echo "[DB] Running: psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE"

# Use psql with explicit connection parameters
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /app/server/db/production-migration.sql 2>&1 | while IFS= read -r line; do
  # Filter out NOTICE messages about existing objects
  if [[ ! "$line" =~ "already exists, skipping" ]] && [[ ! "$line" =~ "NOTICE:" ]]; then
    echo "$line"
  fi
done

# Check if migration was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "[DB] ✅ Database migration completed successfully"
else
  echo "[DB] ❌ Database migration failed"
  exit 1
fi

echo "[DB] Database initialization complete"