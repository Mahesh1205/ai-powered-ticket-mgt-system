---
inclusion: fileMatch
fileMatchPattern: '**/*.sql,**/migrations/**,**/repositories/**,**/db/**,**/seed**'
---

# PostgreSQL Database Validation & Security Standards

These standards apply to all database-related code: migrations, seed scripts, repositories, and any file that interacts with PostgreSQL.

## Query Security

### Parameterized Queries Only
- NEVER use string interpolation or template literals to build SQL queries.
- Always use parameterized placeholders (`$1`, `$2`, etc.) for all user-provided values.
- Use the `pg` library's built-in parameterization or an ORM's query builder.

```typescript
// ✅ CORRECT
const result = await pool.query(
  'SELECT * FROM tickets WHERE id = $1',
  [ticketId]
);

// ❌ WRONG — SQL injection vulnerability
const result = await pool.query(
  `SELECT * FROM tickets WHERE id = '${ticketId}'`
);
```

### Prepared Statements
- Use prepared statements for frequently executed queries to improve performance and security.
- Name prepared statements descriptively for debugging.

## Schema Security

### UUID Primary Keys
- All tables must use UUID as the primary key type (`uuid_generate_v4()` or `gen_random_uuid()`).
- Never use auto-incrementing integers — they leak information about record count and ordering.

### Foreign Key Constraints
- All relationships must have explicit `REFERENCES` constraints with appropriate `ON DELETE` behavior.
- Ticket.createdBy → User.id (ON DELETE RESTRICT)
- Ticket.assignedTo → User.id (ON DELETE SET NULL)
- Comment.ticketId → Ticket.id (ON DELETE CASCADE)
- Comment.createdBy → User.id (ON DELETE RESTRICT)

### NOT NULL Constraints
- Apply `NOT NULL` to all required fields as defined in the domain model.
- Use `DEFAULT` values where appropriate (e.g., `status DEFAULT 'Open'`, `createdAt DEFAULT NOW()`).

### CHECK Constraints
- Enforce enum-like values at the database level:
  ```sql
  CONSTRAINT valid_status CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'))
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
  CONSTRAINT valid_role CHECK (role IN ('agent', 'admin'))
  ```
- Enforce length constraints at the database level:
  ```sql
  CONSTRAINT title_length CHECK (char_length(title) <= 200)
  CONSTRAINT description_length CHECK (char_length(description) <= 5000)
  CONSTRAINT comment_length CHECK (char_length(message) <= 2000)
  CONSTRAINT name_length CHECK (char_length(name) <= 100)
  ```

### Unique Constraints
- Email must have a unique constraint (case-insensitive): use `UNIQUE` on a `LOWER(email)` expression index.
- Prevent duplicates at the database level, not just the application level.

## Migration Standards

### Idempotent Migrations
- Use `IF NOT EXISTS` for CREATE TABLE and CREATE INDEX statements.
- Each migration file must be independently runnable and reversible.
- Name migrations with a timestamp prefix: `001_create_users_table.sql`, `002_create_tickets_table.sql`.

### Migration Order
1. Enable extensions (`uuid-ossp` or `pgcrypto`)
2. Create users table
3. Create tickets table (references users)
4. Create comments table (references tickets and users)
5. Create indexes

### Index Strategy
- Index foreign keys: `ticket.createdBy`, `ticket.assignedTo`, `comment.ticketId`, `comment.createdBy`.
- Index search fields: `CREATE INDEX idx_tickets_title_desc ON tickets USING gin(to_tsvector('english', title || ' ' || description))` or use ILIKE with `pg_trgm`.
- Index status for filtering: `CREATE INDEX idx_tickets_status ON tickets(status)`.
- Index email for login lookups: `CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email))`.

## Seed Script Security

### Password Handling
- Seed scripts must hash passwords with bcrypt (cost factor ≥ 10) before inserting.
- Never store plaintext passwords in seed files — hash them at script execution time.
- Document seed credentials in README only, never in committed code comments.

### Idempotent Seeds
- Use `INSERT ... ON CONFLICT DO NOTHING` or check existence before inserting.
- Running the seed script multiple times must not produce duplicate records or errors.

## Connection Security

### Connection Configuration
- DATABASE_URL must come from environment variables exclusively.
- Use SSL/TLS connections in production (`ssl: { rejectUnauthorized: true }`).
- Set connection pool limits to prevent resource exhaustion (max 20 connections for dev).
- Set statement timeout to prevent long-running queries: `statement_timeout: '30s'`.

### Connection Error Handling
- Implement connection retry logic with exponential backoff.
- Log connection failures without exposing the full DATABASE_URL.
- Gracefully handle pool exhaustion with queued requests or 503 responses.

## Repository Layer Rules

### Data Sanitization at Repository Boundary
- Repositories must never return `passwordHash` — strip it in SELECT statements or map results.
- Use explicit column selection (`SELECT id, name, email, role ...`) instead of `SELECT *`.
- Return typed results — never return raw `pg` Row objects to the service layer.

### Transaction Safety
- Use database transactions for multi-step operations (e.g., delete user + check references).
- Always rollback on error within a transaction block.
- Keep transactions short — no external API calls inside a transaction.

### Error Translation
- Catch PostgreSQL-specific error codes and translate to application errors:
  - `23505` (unique_violation) → HTTP 409
  - `23503` (foreign_key_violation) → HTTP 409
  - `23502` (not_null_violation) → HTTP 400
  - `23514` (check_violation) → HTTP 400

## Validation Checklist

Before accepting any database-related code, verify:

1. ✅ All queries use parameterized placeholders — no string interpolation
2. ✅ All tables have UUID primary keys with `gen_random_uuid()` default
3. ✅ Foreign keys have explicit constraints with correct ON DELETE behavior
4. ✅ CHECK constraints enforce enums and length limits at DB level
5. ✅ Unique constraint on LOWER(email) prevents case-insensitive duplicates
6. ✅ Migrations are ordered, idempotent, and independently runnable
7. ✅ Seed scripts hash passwords at runtime and use ON CONFLICT
8. ✅ Repositories never return passwordHash
9. ✅ Repositories use explicit column lists, not SELECT *
10. ✅ PostgreSQL error codes are caught and translated to HTTP status codes
11. ✅ DATABASE_URL comes from environment variables only
12. ✅ Connection pool has sensible limits and timeout configuration
