# Acceptance Criteria

## Core

- [x] Users can log in with email/password and receive a JWT token
- [x] JWT contains sub, email, role, iat, exp claims with 24h expiry
- [x] Authenticated users can create tickets with title, description, and priority
- [x] New tickets default to "Open" status with auto-generated UUID
- [x] Authenticated users can list, search (keyword), and filter (status) tickets
- [x] Ticket details include associated comments ordered by createdAt ascending
- [x] Ticket fields (title, description, priority, assignedTo) can be updated via PATCH
- [x] Status transitions are enforced by a deterministic state machine
- [x] Valid transitions: Open→In Progress, Open→Cancelled, In Progress→Resolved, In Progress→Cancelled, Resolved→Closed
- [x] Terminal states (Closed, Cancelled) have no outgoing transitions
- [x] Comments can be added to tickets (max 2000 chars, no whitespace-only)
- [x] Admin users can create, update, and delete other users
- [x] Agent users cannot access admin-only endpoints (403)
- [x] User listing is available to all authenticated users (agent + admin)
- [x] Frontend shows role-appropriate navigation (Users section for admin only)
- [x] Frontend displays only valid transition buttons per ticket status

## Validation

- [x] Missing required fields on ticket creation → 400 with field-level details
- [x] Invalid priority value → 400
- [x] Title > 200 chars or description > 5000 chars → 400
- [x] Invalid assignedTo (non-existent user UUID) → 400
- [x] Status field in PATCH /tickets/:id → 400 (must use /status endpoint)
- [x] Invalid status value in transition request → 400
- [x] Missing/empty message on comment → 400
- [x] Comment message > 2000 chars → 400
- [x] Duplicate email on user creation (case-insensitive) → 409
- [x] Invalid user fields (bad email format, password < 6 chars, invalid role) → 400
- [x] Name exceeds max length (100 create, 200 update) → 400

## Error Handling

- [x] Invalid credentials → 401 with generic "Invalid credentials" (no user enumeration)
- [x] Missing/expired/malformed token → 401
- [x] Agent accessing admin endpoint → 403
- [x] Non-existent resource UUID → 404
- [x] Invalid state machine transition → 409
- [x] Delete user with ticket/comment references → 409
- [x] Self-deletion by admin → 409
- [x] All errors follow `{ error, code, details? }` structure
- [x] 500 errors never expose stack traces, SQL, file paths, or env vars
- [x] Frontend displays API error messages inline near forms
- [x] Frontend handles 401 by clearing session and redirecting to login

## Testing

- [x] Property-based tests validate 25 correctness properties using fast-check
- [x] Integration tests: all 5 valid state machine transitions return 200
- [x] Integration tests: all invalid state machine transitions return 409
- [x] Integration tests: valid login returns 200 + token + user
- [x] Integration tests: invalid password returns 401 without token
- [x] Integration tests: missing token returns 401
- [x] Integration tests: expired JWT returns 401
- [x] Integration tests: agent on admin endpoint returns 403
- [x] Integration tests: admin creating user returns 201 without passwordHash
- [x] Integration tests: GET /auth/me with valid token returns user
- [x] Frontend test: status transition buttons match state machine rules
- [x] Smoke test: GET /api-docs returns 200 without authentication

## Documentation

- [x] README with prerequisites, setup, and run commands
- [x] .env.example at root with all required variables
- [x] OpenAPI/Swagger documentation at /api-docs (unauthenticated access)
- [x] Architecture design notes (docs/design-notes.md)
- [x] State machine documentation (docs/state-machine.md)
- [x] Authentication design (docs/auth-design.md)
- [x] NFR checklist (docs/nfr-checklist.md)
- [x] Debugging notes template (docs/debugging-notes.md)
- [x] AI tool workflow documentation (tool-workflow.md)
- [x] Dockerfile for backend (multi-stage, Node.js 22 Alpine)
- [x] Dockerfile for frontend (multi-stage, nginx:alpine)
- [x] docker-compose.yml with postgres, backend, and frontend services
- [x] GitHub Actions CI workflow (.github/workflows/ci.yml)
