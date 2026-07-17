# AI Prompts — Code Review Phase

## Prompt 1: Security Review

**Context:** After completing the backend, reviewed for security issues.

**Prompt:**
> Review the backend implementation for security concerns: SQL injection, credential exposure, missing auth checks, and improper error handling. Check against Requirements 17 (security) and 15 (error handling).

**AI Findings:**
- ✅ All queries use parameterized placeholders ($1, $2)
- ✅ passwordHash excluded at repository level (not just response mapping)
- ✅ Auth middleware applied to all protected routes
- ✅ 500 responses don't expose internals
- ⚠️ JWT_SECRET startup guard was missing → added

---

## Prompt 2: Architecture Boundary Review

**Context:** Verifying layered architecture compliance.

**Prompt:**
> Check that routes only import from services, services only import from repositories. No direct database queries in route handlers. Verify the import graph respects layer boundaries.

**AI Findings:**
- ✅ No `pool.query()` in route files
- ✅ No repository imports in route files
- ✅ Services don't import Express types
- ✅ Middleware is separate from business logic
- ✅ Error handler is last middleware

---

## Prompt 3: State Machine Completeness Review

**Context:** Verifying all state machine behavior is correctly implemented.

**Prompt:**
> Review the state machine implementation. Verify: single source of truth, all transitions in the table, terminal states have no transitions, status can't be changed via PATCH /tickets/:id, and frontend mirrors the logic.

**AI Findings:**
- ✅ `ticketStateMachine.ts` is sole transition authority
- ✅ 5 valid transitions, 2 terminal states
- ✅ PATCH /tickets/:id explicitly rejects status field (400)
- ✅ Frontend imports same transition logic for button rendering
- ✅ Property tests 1, 2, 23 cover the full matrix

---

## Prompt 4: Test Coverage Review

**Context:** Verifying test coverage matches the mandatory test matrix.

**Prompt:**
> Verify that integration tests cover all 10 mandatory state machine cases and all 8 mandatory auth cases from Requirements 19 and 20.

**AI Findings:**
- ✅ All 5 valid transitions tested (200 expected)
- ✅ All 5 invalid transition categories tested (409 expected)
- ✅ All 8 auth scenarios covered
- ✅ Property tests provide additional coverage beyond integration
