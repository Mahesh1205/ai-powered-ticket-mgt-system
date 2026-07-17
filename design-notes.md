# Design Notes

## Architecture Overview

The system follows a client-server architecture with clear separation:

- **Frontend:** React 19 SPA (Vite 6) — UI rendering, state management (Zustand 5), client-side routing
- **Backend:** Node.js 22 + Express 5 REST API — business logic, authentication, data access
- **Database:** PostgreSQL — persistent storage with migrations, seeds, and parameterized queries

Communication: Frontend → HTTP/JSON → Backend → SQL (parameterized) → PostgreSQL

## Frontend Design

- **Framework:** React 19 with TypeScript
- **Build:** Vite 6 (fast HMR, ES module-based)
- **State:** Zustand 5 (3 stores: authStore, ticketStore, userStore)
- **Styling:** Tailwind CSS 4 (utility-first, no custom CSS files)
- **Routing:** react-router-dom v7 with ProtectedRoute wrapper
- **HTTP Client:** Axios with 401 interceptor for automatic logout

Key patterns:
- Session restoration on app load (check sessionStorage → validate with /auth/me)
- Role-based rendering (admin sees Users nav, agent redirected from /users)
- State machine logic mirrored in frontend for transition button rendering

## Backend Design

- **Framework:** Express 5 (TypeScript, strict mode)
- **Architecture:** Layered (Routes → Services → Repositories)
- **Auth:** Custom JWT (jsonwebtoken + bcrypt), no third-party auth provider
- **Database:** Raw SQL with pg driver, parameterized queries ($1, $2 placeholders)
- **Errors:** Custom error classes → global error handler → consistent JSON structure

Layer boundaries:
- Routes: HTTP handling only (no business logic, no direct DB access)
- Services: Business logic, orchestration, validation
- Repositories: Data access, SQL queries, entity mapping
- Middleware: Cross-cutting concerns (auth, error handling)

## Database Design

- **Engine:** PostgreSQL 16+
- **IDs:** UUID (uuid_generate_v4)
- **Constraints:** CHECK for enums (role, priority, status), FK with ON DELETE behavior
- **Migrations:** Numbered SQL files, idempotent (IF NOT EXISTS)
- **Indexes:** status, createdAt DESC, ticketId (for comment queries)

## Validation Strategy

Two layers of validation:
1. **Backend (authoritative):** Service layer validates all business rules, returns structured 400 errors
2. **Frontend (UX):** Client-side validation for immediate feedback (mirroring backend rules)

Backend validation covers: required fields, max lengths, enum values, FK existence, state machine transitions, duplicate detection.

## Error Handling Strategy

```
Custom Error Classes → Throw in Service Layer → Catch in Error Handler Middleware → JSON Response
```

| Error Class | HTTP Status | Use Case |
|-------------|-------------|----------|
| ValidationError | 400 | Invalid input |
| UnauthorizedError | 401 | Missing/invalid auth |
| ForbiddenError | 403 | Insufficient role |
| NotFoundError | 404 | Resource doesn't exist |
| ConflictError | 409 | State conflict, duplicate, FK violation |

Response format: `{ "error": "message", "code": "CODE", "details": {} }`

## Testing Strategy Link

See [test-strategy.md](./test-strategy.md) for full testing approach including property-based tests, integration tests, and coverage details.
