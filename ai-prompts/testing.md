# AI Prompts — Testing Phase

## Prompt 1: Property-Based Tests for State Machine

**Context:** Task 4.5 — Validating Properties 1 and 2 from design doc.

**Prompt:**
> Write property tests for the ticket state machine. Property 1: For any non-terminal status and any valid target, isValidTransition returns true. Property 2: For any status and any invalid target, isValidTransition returns false and state is preserved. Use fast-check.

**Outcome:** `ticketStateMachine.property.test.ts` with:
- Generators for TicketStatus (arbitrary enum values)
- Property 1: `fc.assert(fc.property(nonTerminalStatus, validTarget, ...))` verifying transitions
- Property 2: Tests all (status, target) pairs not in transition table return false

---

## Prompt 2: Auth Property Tests

**Context:** Task 3.3 — Validating Properties 4-9 from design doc.

**Prompt:**
> Write property tests for auth module covering: JWT claim structure (P4), login round trip (P5), wrong password rejection (P6), malformed request rejection (P7), session round trip (P8), invalid token rejection (P9).

**Outcome:** Property tests using fast-check string generators for emails/passwords, verifying JWT decode structure, round-trip token→/auth/me, and universal rejection of random strings as tokens.

---

## Prompt 3: Integration Tests — State Machine Matrix

**Context:** Task 13.1 — All mandatory state machine integration tests.

**Prompt:**
> Write integration tests for the state machine using supertest. Test all 5 valid transitions (expect 200) and 5 invalid transitions (expect 409). Create test user, authenticate, and create fresh ticket per test.

**Outcome:** `stateMachine.test.ts` with:
- `beforeAll`: Create and authenticate test user
- `beforeEach`: Create fresh ticket in "Open" state
- Helper to transition ticket to specific state
- 10 test cases matching the mandatory test matrix

---

## Prompt 4: Integration Tests — Auth Matrix

**Context:** Task 13.2 — All mandatory auth integration tests.

**Prompt:**
> Write auth integration tests: valid login (200+token+user), wrong password (401), non-existent email (401), missing token (401), expired JWT (401), agent on admin endpoint (403), admin create user (201 no passwordHash), GET /auth/me (200+user).

**Outcome:** `auth.test.ts` with 8 test cases covering the complete auth matrix from requirements.

---

## Prompt 5: Frontend Component Tests

**Context:** Task 10.5 — Property 23 validation.

**Prompt:**
> Write frontend tests verifying that status transition buttons match the state machine. For each status, render the component and assert only valid target buttons are displayed. For terminal states, assert no buttons.

**Outcome:** Component test using the state machine transition table to verify button rendering matches expected valid transitions for each of the 5 statuses.
