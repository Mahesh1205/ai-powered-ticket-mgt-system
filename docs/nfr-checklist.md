# Non-Functional Requirements Checklist

This document verifies that each non-functional requirement (NFR) is addressed in the implementation.

## Security (Requirement 17)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 17.1 | Passwords stored with bcrypt cost ≥ 10 | ✅ Met | `authService.ts` and `userService.ts` use `bcrypt.hash(password, 10)`. Property 22 validates this. |
| 17.2 | JWT_SECRET in env vars only, never in code | ✅ Met | Accessed via `process.env.JWT_SECRET`. Not present in any source file. `.env.example` has placeholder only. |
| 17.3 | .env in .gitignore, never committed | ✅ Met | `backend-api/.gitignore` includes `.env`. Root `.gitignore` also excludes `.env` files. |
| 17.4 | passwordHash never in any API response | ✅ Met | Repository layer excludes `passwordHash` from SELECT results. Property 3 validates this across all endpoints. |
| 17.5 | JWT_SECRET ≥ 32 characters, reject startup otherwise | ✅ Met | `src/index.ts` checks `JWT_SECRET.length >= 32` before server starts, exits with error if violated. |

## Backend Architecture (Requirement 18)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 18.1 | Separate layers: routes, services, repositories | ✅ Met | `src/routes/`, `src/services/`, `src/repositories/` directories with strict import boundaries. |
| 18.2 | State machine testable independently | ✅ Met | `ticketStateMachine.ts` is a pure function module. Property tests 1 & 2 test it without HTTP/DB. |
| 18.3 | README with prerequisites, setup, commands | ✅ Met | `README.md` documents Node.js 22, PostgreSQL, env setup, install, migrate, seed, and start commands. |
| 18.4 | Route handlers have no direct DB queries | ✅ Met | All routes call service methods; no `pool.query()` calls exist in route files. |

## Data Persistence (Requirement 16)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 16.1 | createdAt/updatedAt on all entities | ✅ Met | All tables have timestamp columns with DEFAULT NOW(). |
| 16.2 | UUID primary keys | ✅ Met | All tables use `UUID PRIMARY KEY DEFAULT uuid_generate_v4()`. |
| 16.3 | Migrations produce complete schema | ✅ Met | Running 001–003 migrations on empty DB creates all tables, indexes, and constraints. |
| 16.4 | Idempotent seed script | ✅ Met | `seed.js` uses `INSERT ... ON CONFLICT DO NOTHING`. |
| 16.5 | Parameterized queries (no SQL injection) | ✅ Met | All repository methods use `$1, $2` placeholders with `pool.query(sql, params)`. |
| 16.6 | Foreign key constraints | ✅ Met | `tickets.createdBy` → `users.id`, `tickets.assignedTo` → `users.id`, `comments.ticketId` → `tickets.id`, `comments.createdBy` → `users.id`. |
| 16.7 | Data survives restart | ✅ Met | PostgreSQL persists data to disk; no in-memory storage used. |
| 16.8 | db/ directory structure | ✅ Met | `db/scripts/`, `db/migrations/`, `db/seeds/` organized as specified. |
| 16.9 | `npm run db:setup` single command | ✅ Met | Runs create → migrate → seed via `setup.sh`. |
| 16.10 | Individual db scripts | ✅ Met | `db:create`, `db:migrate`, `db:seed` available separately. |
| 16.11 | DATABASE_URL format | ✅ Met | `postgresql://user:pass@host:port/dbname` format, admin URL derived by replacing DB name. |

## Input Validation and Error Handling (Requirement 15)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 15.1 | Structured error format `{ error, code, details? }` | ✅ Met | `errorHandler.ts` and custom error classes enforce consistent structure. Property 24 validates. |
| 15.2 | 500 responses exclude internals | ✅ Met | Error handler returns generic message; stack traces logged server-side only. |
| 15.3 | Frontend displays API errors inline | ✅ Met | Form components display `error` field from API responses adjacent to the form. |
| 15.4 | Network failure handling | ✅ Met | Axios interceptor catches network errors; UI shows "Service unavailable" with retry. |

## Authentication and Access Control (Requirement 3)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 3.1 | Missing token → 401 | ✅ Met | `authMiddleware` returns 401 when Authorization header absent. |
| 3.2 | Malformed/expired token → 401 | ✅ Met | JWT verification catches all invalid token forms. |
| 3.3 | Agent on admin endpoint → 403 | ✅ Met | `requireAdmin` middleware checks role. Property 10 validates. |
| 3.4 | Frontend redirects unauthenticated → /login | ✅ Met | `ProtectedRoute` component checks sessionStorage. |
| 3.5 | 401 response → clear session, redirect | ✅ Met | Axios 401 interceptor triggers logout flow. |

## Testing (Requirements 19, 20)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 19.1–19.10 | State machine integration tests | ✅ Met | `tests/integration/stateMachine.test.ts` covers all 10 transition scenarios. |
| 20.1–20.8 | Auth integration tests | ✅ Met | `tests/integration/auth.test.ts` covers all 8 auth scenarios. |

## Documentation (Requirement 21)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 21.1 | tool-workflow.md at repo root | ✅ Met | Documents AI tool usage, context provision, methodology. |
| 21.2 | tool-workflow.md includes privacy/reuse sections | ✅ Met | Sections on information avoidance and real-project reuse. |
| 21.4 | Design docs (design-notes, state-machine, auth-design) | ✅ Met | `docs/design-notes.md`, `docs/state-machine.md`, `docs/auth-design.md`. |
| 21.5 | NFR checklist | ✅ Met | This document (`docs/nfr-checklist.md`). |
| 21.6 | Debugging notes | ✅ Met | `docs/debugging-notes.md` template provided. |
| 21.8 | .env.example at root | ✅ Met | Contains DATABASE_URL, JWT_SECRET, PORT placeholders. |
