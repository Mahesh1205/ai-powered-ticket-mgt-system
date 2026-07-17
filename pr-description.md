# PR Description

## Summary

Full-stack implementation of an internal support ticket management system, built using spec-driven development with Kiro AI. The system provides JWT-authenticated ticket lifecycle management with a deterministic state machine, role-based access control, and comprehensive testing via property-based tests.

## Features Implemented

- **Authentication:** JWT login/logout, 24h token expiry, session restoration, startup secret validation
- **Ticket Management:** CRUD with search (ILIKE) and status filtering, partial updates
- **State Machine:** Deterministic ticket lifecycle (Open→In Progress→Resolved→Closed, with Cancelled terminal)
- **Comments:** Ticket-scoped comments with validation (max 2000 chars, no whitespace-only)
- **User Management:** Admin-only CRUD with deletion guards, case-insensitive email uniqueness
- **Role-Based Access:** Agent (tickets/comments) vs Admin (full including user management)
- **API Documentation:** OpenAPI/Swagger at /api-docs (unauthenticated access)
- **Docker:** Multi-stage builds for backend + frontend, compose orchestration with PostgreSQL
- **CI/CD:** GitHub Actions pipeline (lint → build → test with PostgreSQL service container)

## Technical Changes

### Backend (Node.js 22 + Express 5 + TypeScript)
- Layered architecture: routes → services → repositories
- Pure function state machine module (single source of truth)
- Custom error classes with consistent `{ error, code, details? }` responses
- Parameterized SQL queries throughout (no ORM)
- bcrypt password hashing (cost factor 10)
- JWT middleware with role enforcement

### Frontend (React 19 + Vite 6 + Zustand 5 + Tailwind CSS 4)
- Three Zustand stores: auth, tickets, users
- Protected route component with role checking
- Axios interceptor for automatic 401 → logout
- State machine logic mirrored for transition button rendering

## Database Changes

- 3 migration files: users, tickets, comments tables
- UUID primary keys, CHECK constraints for enums
- Foreign keys with appropriate ON DELETE behavior
- Indexes on status, createdAt, and ticketId columns
- Idempotent seed script (admin + agent default users)

## Testing Done

- 25 property-based tests (fast-check) validating correctness properties
- 10 state machine integration tests (5 valid, 5 invalid transitions)
- 8 authentication integration tests
- 1 Swagger smoke test
- Unit tests for auth, tickets, comments, error handling
- Frontend component tests for state transition button rendering

## AI Usage Summary

- **Kiro** used as primary AI tool throughout the entire lifecycle
- Spec-driven: requirements (20 formal requirements with EARS-format criteria) → design (architecture, data models, API contracts, correctness properties) → tasks (56 ordered implementation steps with dependency DAG)
- AI generated code following established patterns, validated against acceptance criteria
- Property-based tests derived from formal correctness properties in the design doc
- Debugging sessions documented with AI-assisted root cause analysis

## Screenshots / Demo Notes

- Login at http://localhost:5173 with admin@example.com / Admin123!
- Swagger docs at http://localhost:3001/api-docs
- Docker: `docker-compose up --build` starts everything on localhost:5173 (UI) + localhost:3000 (API)

## Known Limitations

- No pagination (stretch goal, not core requirement)
- No real-time updates (manual refresh required)
- No file attachments on tickets/comments
- No email notifications
- No token refresh — users re-authenticate after 24h
- No audit log beyond createdAt/updatedAt timestamps

## Future Improvements

- Server-side pagination with cursor-based approach
- WebSocket notifications for ticket updates
- File attachment support (S3 storage)
- Audit trail with user action logging
- Role hierarchy (add "manager" role with scoped visibility)
- Rate limiting on all endpoints (currently only login)
- Automated E2E tests (Playwright)
