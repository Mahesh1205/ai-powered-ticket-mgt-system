# Requirement Analysis

## Selected Project Option

AI-Powered Internal Support Ticket Management System — a full-stack application demonstrating spec-driven development with AI assistance across the entire software delivery lifecycle.

## My Understanding (in your own words)

Build an internal tool where team members (agents) can create support tickets and progress them through a defined lifecycle, while administrators manage user accounts. The core challenge is implementing a deterministic state machine that governs ticket status transitions, backed by a clean layered architecture that's independently testable at each level. The system must demonstrate security best practices (JWT auth, bcrypt hashing, parameterized queries) and be deliverable as a complete package (Docker, CI, documentation).

## Functional Requirements

1. **Authentication** — Login via email/password, JWT token issuance (24h expiry), session restoration on page load, logout (client-side token clear)
2. **Ticket CRUD** — Create tickets (title, description, priority), list with search/filter, view details with comments, update fields (partial PATCH)
3. **State Machine** — Status transitions enforced server-side: Open→In Progress→Resolved→Closed, with Cancelled as alternate terminal from Open or In Progress
4. **Comments** — Add comments to tickets, ordered by creation time, max 2000 characters
5. **User Management (Admin)** — Create/update/delete users, duplicate email detection (case-insensitive), deletion blocked when user has references
6. **Role-Based Access** — Agent: ticket/comment operations + user listing; Admin: everything including user management
7. **Search & Filter** — Keyword search on title+description (ILIKE), status filter, combinable

## Non-Functional Requirements

1. **Security** — bcrypt cost ≥10, JWT_SECRET ≥32 chars in env only, no passwordHash in responses, parameterized SQL queries, .env gitignored
2. **Architecture** — Layered backend (Routes→Services→Repositories), no direct DB access from routes
3. **Persistence** — PostgreSQL, migrations for schema, idempotent seed script, data survives restarts
4. **Error Handling** — Consistent `{ error, code, details? }` structure, no stack traces in 500s
5. **Testing** — Property-based tests for correctness properties, integration tests for state machine and auth flows
6. **Documentation** — OpenAPI/Swagger at /api-docs, README from clean clone, architecture docs
7. **Deployment** — Docker multi-stage builds, docker-compose orchestration, GitHub Actions CI

## Assumptions

- Single-tenant deployment (one team/organization)
- No real-time features (WebSocket/SSE) — polling or manual refresh for updates
- No file attachments on tickets or comments
- No pagination (stretch goal noted but not core)
- No email notifications or webhooks
- Browser sessionStorage is acceptable (tabs don't share sessions)
- PostgreSQL is available locally or via connection string
- No audit log beyond timestamps (createdAt/updatedAt)

## Clarifications (questions for a product owner)

1. Should ticket assignment be restricted by role (only admins can assign), or can any user assign/reassign?
   - *Decision:* Any authenticated user can assign via PATCH
2. Should deleted users' tickets be reassigned or left as-is?
   - *Decision:* Deletion is blocked (409) if user has any references
3. Is there a maximum number of comments per ticket?
   - *Decision:* No limit, only per-comment character limit (2000)
4. Should the search be full-text or simple ILIKE?
   - *Decision:* PostgreSQL ILIKE on title+description (simple, adequate for internal tool)
5. Should token refresh be supported?
   - *Decision:* No, 24h expiry with re-authentication is sufficient for an internal tool

## Edge Cases

- **Self-deletion** — Admin cannot delete their own account (409)
- **Empty search results** — Returns 200 with empty array (not 404)
- **Whitespace-only comments** — Rejected with 400 (trimmed check)
- **Status via PATCH /tickets/:id** — Explicitly rejected with 400 (must use /status endpoint)
- **Concurrent transitions** — Last-write-wins at DB level (acceptable for internal tool)
- **Case-insensitive email uniqueness** — "Admin@Example.com" conflicts with "admin@example.com"
- **assignedTo referencing non-existent user** — 400 validation error
- **Terminal states** — No outbound transitions from Closed or Cancelled
- **JWT_SECRET < 32 chars** — Application refuses to start
- **Expired token on /auth/me** — Returns 401, frontend clears session and redirects to login
