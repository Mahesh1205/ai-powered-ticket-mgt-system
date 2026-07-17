# Database Setup Notes

## Engine

PostgreSQL 16+ (tested with 16-alpine in Docker)

## Connection

Format: `postgresql://username:password@host:port/database_name`

Examples:
- Standard: `postgresql://postgres:postgres@localhost:5432/ticket_system`
- macOS Homebrew (no password): `postgresql://localhost:5432/ticket_system`
- Docker Compose: `postgresql://postgres:postgres@postgres:5432/ticket_system`

## Setup Commands

```bash
cd backend-api

# Full setup (create DB → migrate → seed)
npm run db:setup

# Individual steps
npm run db:create    # Creates database if not exists
npm run db:migrate   # Runs all migration files in order
npm run db:seed      # Seeds default users (idempotent)
```

## Schema Migrations

Located in `backend-api/db/migrations/`:

| File | Creates |
|------|---------|
| `001_create_users.sql` | users table with role CHECK constraint |
| `002_create_tickets.sql` | tickets table with FK references, priority/status CHECKs, indexes |
| `003_create_comments.sql` | comments table with CASCADE delete, ticketId index |

All migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency.

## Migration Runner

`backend-api/db/migrate.js` — A lightweight Node.js script that:
1. Reads all `.sql` files from `db/migrations/` directory
2. Sorts them by filename (numeric prefix)
3. Executes each against the database using the pg Pool
4. Uses DATABASE_URL from environment

## Seed Data

`backend-api/db/seed.js` — Seeds default users:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | admin |
| agent@example.com | Agent123! | agent |

- Passwords hashed with bcrypt (cost factor 10)
- Uses `INSERT ... ON CONFLICT (email) DO NOTHING` for idempotency
- Safe to run multiple times

## Setup Script

`backend-api/db/scripts/setup.sh`:
1. Derives admin connection URL (replaces DB name with `postgres`)
2. Creates target database via `create-database.sql`
3. Runs all migrations via `migrate.js`
4. Seeds default users via `seed.js`

## Docker Compose Database

When using `docker-compose up`:
- PostgreSQL 16-alpine starts with health check
- Backend waits for `service_healthy` condition before starting
- Backend command runs `migrate.js` → `seed.js` → starts server
- Data persisted in named volume `pgdata`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` | Ensure PostgreSQL is running and DATABASE_URL is correct |
| `database does not exist` | Run `npm run db:create` first |
| `relation already exists` | Safe to ignore (IF NOT EXISTS handles this) |
| `duplicate key on seed` | Safe (ON CONFLICT DO NOTHING) |
| Permission denied on setup.sh | Run `chmod +x db/scripts/setup.sh` |
