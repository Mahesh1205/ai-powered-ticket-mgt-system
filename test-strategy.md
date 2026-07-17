# Test Strategy

## Test Scope

The testing strategy validates correctness at three levels: property-based tests for universal invariants, unit tests for specific logic, and integration tests for end-to-end API flows. The frontend includes component tests for UI logic that mirrors backend rules (state machine button rendering).

**Test Framework:** Vitest (runner) + fast-check (property-based) + Supertest (HTTP assertions)

## Unit Tests

Location: `backend-api/tests/unit/`

| File | Coverage |
|------|----------|
| `auth-middleware.test.ts` | JWT verification, token extraction, role checks |
| `auth-service.test.ts` | Login logic, token issuance, credential validation |
| `auth-properties.test.ts` | Property tests for auth module (claims, round-trips) |
| `ticket-state-machine.test.ts` | All transition combinations, pure function tests |
| `ticket-service.test.ts` | Ticket CRUD business logic, validation |
| `comment-service.test.ts` | Comment creation, validation, whitespace rejection |
| `error-handling.test.ts` | Error handler middleware, structured response format |

## Property-Based Tests (fast-check)

Location: `backend-api/tests/property/`

25 correctness properties validated:

| Property | What It Tests |
|----------|--------------|
| 1 | Valid state machine transitions succeed |
| 2 | Invalid transitions rejected, state preserved |
| 3 | passwordHash never exposed in any response |
| 4 | JWT contains required claims with 24h expiry |
| 5 | Login round trip (valid creds → valid token + user) |
| 6 | Wrong password always rejected |
| 7 | Malformed login requests rejected |
| 8 | Session retrieval round trip |
| 9 | Invalid/expired tokens universally rejected |
| 10 | Agent cannot access admin endpoints |
| 11 | Valid ticket creation produces correct defaults |
| 12 | Invalid ticket creation input rejected |
| 13 | Search/filter results match criteria |
| 14 | Ticket list ordered by createdAt descending |
| 15 | Ticket comments ordered by createdAt ascending |
| 16 | Partial update preserves unmodified fields |
| 17 | Status cannot be modified via PATCH /tickets/:id |
| 18 | Whitespace-only comments rejected |
| 19 | Duplicate email detection is case-insensitive |
| 20 | User partial update preserves unmodified fields |
| 21 | User deletion blocked when references exist |
| 22 | Passwords stored with bcrypt cost ≥ 10 |
| 23 | Frontend displays only valid transition buttons |
| 24 | Error responses follow consistent structure |
| 25 | OpenAPI docs accessible without auth |

## API / Integration Tests

Location: `backend-api/tests/integration/`

### State Machine Integration Tests (`stateMachine.test.ts`)
- Open → In Progress (200)
- Open → Cancelled (200)
- In Progress → Resolved (200)
- In Progress → Cancelled (200)
- Resolved → Closed (200)
- Open → Resolved (409)
- Open → Closed (409)
- In Progress → Open (409)
- Closed → any (409)
- Cancelled → any (409)

### Authentication Integration Tests (`auth.test.ts`)
- Valid login → 200 + token + user object
- Wrong password → 401 + no token
- Non-existent email → 401 + no token
- Missing Bearer token → 401
- Expired JWT → 401
- Agent on DELETE /users/:id → 403
- Admin POST /users → 201 + no passwordHash
- GET /auth/me with valid token → 200 + user

### Swagger Smoke Test (`swagger.test.ts`)
- GET /api-docs → 200 without Authorization header
- Response content-type includes text/html

## Component Tests (Frontend)

Location: `ui/src/test/`

| Test | What It Validates |
|------|------------------|
| Status transition button rendering | Buttons match state machine valid targets |
| Terminal states | No buttons for Closed/Cancelled |

## Edge Case Tests

Covered within property and integration tests:
- Empty string fields on ticket creation → 400
- Title at exactly 200 chars → accepted; 201 chars → rejected
- Description at exactly 5000 chars → accepted; 5001 → rejected
- Comment with only spaces/tabs/newlines → rejected
- Self-deletion by admin → 409
- Delete user referenced by tickets → 409
- Case-insensitive email collision → 409
- Status field in PATCH /tickets/:id → 400
- Malformed UUID in path → 400/404
- Expired JWT → 401 universally

## Tests Not Covered (and why)

| Area | Reason |
|------|--------|
| End-to-end (Cypress/Playwright) | Time constraint; UI correctness validated through component tests and manual testing |
| Load/performance testing | Internal tool with low user count; not a requirement |
| Frontend integration tests (MSW mocking) | Covered by property test for button rendering; backend integration tests validate API |
| WebSocket/real-time | Not implemented (no real-time features) |
| Browser compatibility | Vite targets modern browsers; manual QA sufficient for internal tool |
| Accessibility (a11y) | Not a stated requirement; Tailwind provides semantic HTML patterns |

## Running Tests

```bash
# All backend tests (property + integration + unit)
cd backend-api && npm test

# Property tests only
npm run test:properties

# Integration tests only
npm run test:integration

# Frontend tests
cd ui && npm test
```
