# AI Prompts — Implementation Phase

## Prompt Pattern: Layer-by-Layer Implementation

Each implementation task followed a consistent prompt structure:

```
Execute Task [N.M] from the spec.
Task details: [sub-task list from tasks.md]
Requirements: [referenced requirement IDs]
```

Kiro read relevant existing code first, then generated implementation matching established patterns.

---

## Prompt 1: Database Layer

**Context:** Tasks 2.1-2.2 — Creating migrations and seed data.

**Prompt:**
> Execute Task 2.1: Create database migration files. Create SQL migrations for users, tickets, and comments tables following the schema in the design document. Use CREATE TABLE IF NOT EXISTS for idempotency.

**Outcome:** Three migration files with proper constraints, foreign keys, indexes. Setup script with database creation logic.

---

## Prompt 2: Auth Middleware

**Context:** Task 3.1 — JWT verification and role enforcement.

**Prompt:**
> Execute Task 3.1: Implement auth middleware. Create JWT verification middleware that extracts Bearer token, verifies signature and expiry, attaches decoded user to req. Create requireAdmin that checks role. Return structured error responses.

**Outcome:** `auth.ts` middleware with consistent error handling, role checking, and user context attachment.

---

## Prompt 3: State Machine Service

**Context:** Task 4.2 — Pure function state machine.

**Prompt:**
> Execute Task 4.2: Implement ticket state machine as a pure function module. Define transition table, export isValidTransition and getValidTransitions functions. No side effects, no database access.

**Outcome:** Clean, testable module with explicit transition table. Used by both backend service and frontend button rendering.

---

## Prompt 4: Backend Services

**Context:** Tasks 4.3, 5.1, 6.2 — Business logic layer.

**Prompt:**
> Execute Task 4.3: Implement ticket service with business logic. Enforce state machine for transitions (409 on invalid), reject status in PATCH, validate input constraints (title max 200, description max 5000, priority enum), validate assignedTo references existing user.

**Outcome:** Service methods that orchestrate repository calls with business rules. Consistent error throwing with custom error classes.

---

## Prompt 5: Frontend Implementation

**Context:** Tasks 9-11 — React frontend.

**Prompt:**
> Execute Task 10.4: Implement ticket detail page with status transitions and comments. Display only valid transition buttons based on current status. Hide all transition buttons for terminal states. Show 409 error as toast. Display comments ordered by createdAt ascending.

**Outcome:** TicketDetailPage component with state machine integration, dynamic button rendering, inline error display, and comment form with validation.

---

## Prompt 6: Docker and CI

**Context:** Tasks 17-18 — Infrastructure.

**Prompt:**
> Execute Task 17.6: Create docker-compose.yml with postgres (16-alpine, health check, named volume), backend (multi-stage build, migrations on start), and frontend (nginx:alpine serving built React).

**Outcome:** Complete Docker Compose setup with proper dependency ordering, health checks, and environment variable handling.
