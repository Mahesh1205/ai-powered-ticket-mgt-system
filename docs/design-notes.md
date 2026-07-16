# Design Notes

## Architectural Decisions

### 1. Layered Backend Architecture

**Decision:** Organize the backend into Routes → Services → Repositories layers with strict import boundaries.

**Rationale:**
- **Separation of concerns** — Each layer has a single responsibility: routes handle HTTP, services encapsulate business logic, repositories manage data access.
- **Testability** — Services can be tested without an HTTP server; repositories can be tested without business logic overhead.
- **Maintainability** — Changes to the database schema only affect the repository layer; new business rules only require service changes.

**Constraints:**
- Route files import ONLY from services (never directly from repositories)
- Service files import ONLY from repositories for data access
- No direct database queries in route handlers

**Directory Structure:**
```
backend-api/src/
├── routes/         # HTTP request/response handling
├── services/       # Business logic, orchestration
├── repositories/   # Data access, SQL queries
├── middleware/     # Auth, error handling
├── utils/          # Shared utilities (db pool, errors)
└── types/          # TypeScript interfaces
```

### 2. Zustand 5 for Frontend State Management

**Decision:** Use Zustand 5 with separate stores for auth, tickets, and users.

**Rationale:**
- **Minimal boilerplate** — No providers, reducers, or action creators required (unlike Redux).
- **TypeScript-native** — Full type inference without additional tooling.
- **Selective re-rendering** — Components subscribe to specific state slices, preventing unnecessary re-renders.
- **Store separation** — Auth, ticket, and user concerns are isolated, making each store independently testable.

**Store Architecture:**
- `authStore` — Token management, login/logout, session restoration
- `ticketStore` — Ticket CRUD, search/filter, status transitions, comments
- `userStore` — User management (admin-only)

### 3. JWT Stateless Authentication

**Decision:** Use stateless JWT tokens with 24-hour expiry stored in sessionStorage.

**Rationale:**
- **No server-side session state** — Backend remains horizontally scalable without shared session stores.
- **Self-contained authorization** — Token payload contains user ID, email, and role, eliminating database lookups on every request.
- **sessionStorage over localStorage** — Tokens are cleared when the browser tab closes, reducing exposure window.
- **24-hour expiry** — Balances user convenience (no re-login during a work day) with security (limits token reuse window).

**Trade-offs:**
- Cannot revoke individual tokens without a blocklist (acceptable for internal tool)
- Token size is larger than a session ID (negligible for this use case)

### 4. PostgreSQL with Raw SQL and Parameterized Queries

**Decision:** Use raw SQL with the `pg` driver and parameterized queries instead of an ORM.

**Rationale:**
- **SQL injection prevention** — Parameterized queries ($1, $2 placeholders) guarantee safe query construction.
- **Transparency** — Direct SQL makes query behavior explicit and debuggable.
- **No abstraction leakage** — ORMs sometimes generate unexpected queries; raw SQL gives full control.
- **Lightweight** — No ORM configuration, migrations generator, or model classes needed.

### 5. State Machine as a Pure Function Module

**Decision:** Implement the ticket state machine as a standalone pure-function module with no side effects.

**Rationale:**
- **Testability** — Can be verified with property-based tests without database or HTTP setup.
- **Single source of truth** — One module defines all valid transitions; no duplicate logic elsewhere.
- **Reusability** — Frontend can import the same transition logic for UI rendering (valid buttons).

### 6. Tailwind CSS 4 for Styling

**Decision:** Use Tailwind CSS 4 utility-first framework for all frontend styling.

**Rationale:**
- **Rapid iteration** — Utility classes enable fast UI development without switching between files.
- **Consistency** — Design tokens (spacing, colors, typography) are enforced by the framework.
- **No dead CSS** — Unused styles are automatically purged in production builds.
- **Co-location** — Styles live alongside component markup, improving readability.

### 7. Vite 6 Build Tool

**Decision:** Use Vite 6 as the frontend build tool and dev server.

**Rationale:**
- **Fast HMR** — Native ES module support provides near-instant hot module replacement.
- **Optimized builds** — Rollup-based production builds with tree-shaking and code splitting.
- **First-class React support** — Official React plugin with Fast Refresh.
- **Modern defaults** — ES2022 target, TypeScript support, environment variable handling via `import.meta.env`.

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22 |
| Backend Framework | Express | 5 |
| Language | TypeScript | 5.x |
| Frontend Framework | React | 19 |
| Build Tool | Vite | 6 |
| State Management | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Database | PostgreSQL | 16+ |
| Auth | jsonwebtoken | latest |
| Password Hashing | bcrypt | cost ≥ 10 |
| Testing | Vitest + fast-check | latest |
| HTTP Client | Axios | latest |
| Routing | react-router-dom | 7 |
