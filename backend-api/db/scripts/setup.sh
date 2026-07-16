#!/usr/bin/env bash
set -e

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Derive admin URL (connect to 'postgres' DB) from DATABASE_URL
ADMIN_URL="${DATABASE_URL%/*}/postgres"
DB_NAME="${DATABASE_URL##*/}"

# If called with "create" arg, only create the database
if [ "$1" = "create" ]; then
  echo "Creating database '${DB_NAME}' (if not exists)..."
  psql "$ADMIN_URL" -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || psql "$ADMIN_URL" -c "CREATE DATABASE \"${DB_NAME}\""
  echo "✓ Database ready"
  exit 0
fi

# Full setup: create → migrate → seed
echo "=== Database Setup ==="

echo ""
echo "1. Creating database '${DB_NAME}' (if not exists)..."
psql "$ADMIN_URL" -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || psql "$ADMIN_URL" -c "CREATE DATABASE \"${DB_NAME}\""
echo "   ✓ Database ready"

echo ""
echo "2. Running migrations..."
npm run db:migrate
echo "   ✓ Migrations complete"

echo ""
echo "3. Seeding data..."
npm run db:seed
echo "   ✓ Seed complete"

echo ""
echo "=== Setup Complete ==="
echo "You can now run: npm run dev"
