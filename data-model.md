# Data Model

## Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────────┐
│       USERS         │         │        TICKETS           │
├─────────────────────┤         ├─────────────────────────┤
│ id          UUID PK │◄────────│ createdBy    UUID FK     │
│ name      VARCHAR   │◄────────│ assignedTo   UUID FK     │
│ email     VARCHAR   │         │ id           UUID PK     │
│ passwordHash VARCHAR│         │ title        VARCHAR(200)│
│ role      VARCHAR   │         │ description  TEXT        │
│ createdAt TIMESTAMP │         │ priority     VARCHAR(10) │
│ updatedAt TIMESTAMP │         │ status       VARCHAR(20) │
└─────────────────────┘         │ createdAt    TIMESTAMP   │
         │                      │ updatedAt    TIMESTAMP   │
         │                      └─────────────┬───────────┘
         │                                    │
         │         ┌──────────────────────────┘
         │         │
         ▼         ▼
┌─────────────────────────┐
│       COMMENTS           │
├─────────────────────────┤
│ id          UUID PK      │
│ ticketId    UUID FK      │
│ createdBy   UUID FK      │
│ message   VARCHAR(2000)  │
│ createdAt   TIMESTAMP    │
└─────────────────────────┘
```

## Table Definitions

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| passwordHash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(10) | NOT NULL, CHECK (role IN ('agent', 'admin')) |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |

### tickets

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL |
| priority | VARCHAR(10) | NOT NULL, CHECK (priority IN ('low', 'medium', 'high')) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Open', CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled')) |
| assignedTo | UUID | REFERENCES users(id) ON DELETE SET NULL |
| createdBy | UUID | NOT NULL, REFERENCES users(id) |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |
| updatedAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |

**Indexes:**
- `idx_tickets_status` ON tickets(status)
- `idx_tickets_created_at` ON tickets("createdAt" DESC)
- `idx_comments_ticket_id` ON comments("ticketId")

### comments

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() |
| ticketId | UUID | NOT NULL, REFERENCES tickets(id) ON DELETE CASCADE |
| createdBy | UUID | NOT NULL, REFERENCES users(id) |
| message | VARCHAR(2000) | NOT NULL |
| createdAt | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() |

## Relationships

| From | To | Cardinality | FK Column | On Delete |
|------|----|-------------|-----------|-----------|
| tickets.createdBy | users.id | Many-to-One | createdBy | (restricted — deletion blocked by app logic) |
| tickets.assignedTo | users.id | Many-to-One | assignedTo | SET NULL |
| comments.ticketId | tickets.id | Many-to-One | ticketId | CASCADE |
| comments.createdBy | users.id | Many-to-One | createdBy | (restricted — deletion blocked by app logic) |

## Design Decisions

1. **UUID primary keys** — Avoids sequential ID enumeration, works across distributed systems
2. **CHECK constraints** — Database-level enforcement of role/priority/status enums
3. **CASCADE on comment deletion** — When a ticket is deleted, its comments are automatically removed
4. **SET NULL on assignedTo** — If an assigned user is somehow removed, the ticket remains (though app logic blocks this)
5. **No soft deletes** — Hard delete with FK violation guard (HTTP 409 at app level)
6. **Quoted column names** — camelCase columns (createdAt, updatedAt, etc.) require quoting in PostgreSQL
7. **Timestamp with timezone** — All timestamps stored in UTC with timezone awareness

## Migration Strategy

Migrations are numbered SQL files run sequentially:
- `001_create_users.sql` — Users table with role check constraint
- `002_create_tickets.sql` — Tickets table with FK references and indexes
- `003_create_comments.sql` — Comments table with CASCADE delete

All use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency.

## Seed Data

| Email | Password | Role | Name |
|-------|----------|------|------|
| admin@example.com | Admin123! | admin | Admin User |
| agent@example.com | Agent123! | agent | Agent User |

Passwords are bcrypt-hashed (cost factor 10). Seed script uses `INSERT ... ON CONFLICT DO NOTHING` for idempotency.
