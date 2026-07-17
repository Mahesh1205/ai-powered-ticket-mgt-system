# Test Results

## Summary

| Category | Tests | Status |
|----------|-------|--------|
| Property-Based Tests | 25 properties | ✅ Passing |
| Unit Tests | ~30 test cases | ✅ Passing |
| Integration Tests | 21 test cases | ✅ Passing |
| Frontend Tests | Component tests | ✅ Passing |

## Test Execution

### Backend Tests

```bash
cd backend-api
npm test
```

**Property Tests (`tests/property/`):**
- `ticketStateMachine.property.test.ts` — Properties 1-2 (state machine transitions)
- `ticketCrud.property.test.ts` — Properties 11-14, 16-17 (ticket CRUD invariants)
- `comments.property.test.ts` — Properties 15, 18 (comment ordering, whitespace rejection)
- `userManagement.property.test.ts` — Properties 3, 10, 19-22 (user management invariants)
- `errorResponse.property.test.ts` — Property 24 (consistent error structure)

**Unit Tests (`tests/unit/`):**
- `auth-middleware.test.ts` — JWT verification, token extraction
- `auth-service.test.ts` — Login, token issuance
- `auth-properties.test.ts` — Properties 4-9 (auth round trips)
- `ticket-state-machine.test.ts` — Transition table validation
- `ticket-service.test.ts` — Business logic validation
- `comment-service.test.ts` — Comment validation rules
- `error-handling.test.ts` — Error middleware behavior

**Integration Tests (`tests/integration/`):**
- `stateMachine.test.ts` — 10 cases: 5 valid transitions (200), 5 invalid (409)
- `auth.test.ts` — 8 cases: login, token validation, role enforcement
- `swagger.test.ts` — 1 case: /api-docs accessible without auth

### Frontend Tests

```bash
cd ui
npm test
```

- Status transition button rendering — validates buttons match state machine for each status
- Terminal state rendering — confirms no buttons for Closed/Cancelled

## Property-Based Test Details

Property-based tests use `fast-check` to generate random inputs and verify invariants hold universally. Key configuration:

- **Runs per property:** 100 (default fast-check numRuns)
- **Shrinking:** Enabled (finds minimal failing example)
- **Seed:** Reproducible via vitest seed option

### Sample Properties Validated:

**Property 1 (State Machine):** For any non-terminal status S and valid target T from S's transition table, calling `isValidTransition(S, T)` returns true.

**Property 3 (No passwordHash):** For any API response containing user data, recursively checking all nested objects confirms no `passwordHash` key exists.

**Property 19 (Case-insensitive email):** For any email string E that differs from an existing user's email only in letter casing, user creation returns 409.

## Integration Test Environment

- **Database:** PostgreSQL (test database, created per test run or using CI service container)
- **Auth:** Tests create/authenticate test users with known credentials
- **Isolation:** Each test creates its own test data; database is rolled back or cleaned between suites
- **CI:** PostgreSQL 16-alpine service container in GitHub Actions

## Known Test Limitations

1. **No E2E browser tests** — UI correctness validated via component tests and manual testing
2. **Concurrent access** — Not tested (internal tool with low contention)
3. **Performance/load** — Not tested (not a stated requirement)
4. **Network failure simulation** — Frontend network error handling tested manually

## Running Specific Test Suites

```bash
# All tests
cd backend-api && npm test

# Only property-based tests
npm run test:properties

# Only integration tests
npm run test:integration

# Frontend tests
cd ui && npm test
```
