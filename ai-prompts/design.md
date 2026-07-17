# AI Prompts — Design Phase

## Prompt 1: Architecture Design

**Context:** Requirements were finalized, needed technical design document.

**Prompt:**
> Generate the technical design document from the requirements, including architecture diagrams, data models, API contracts, state machine definition, and correctness properties.

**Outcome:** Comprehensive design document with:
- Mermaid architecture diagrams (high-level, request flow, state machine, ER diagram)
- Layered backend design (Routes → Services → Repositories)
- Complete TypeScript interfaces for all DTOs and request types
- Database schema with constraints, indexes, and migration strategy
- 25 formal correctness properties bridging spec to tests
- Docker and CI architecture

---

## Prompt 2: State Machine Design

**Context:** Needed formal transition table for implementation and testing.

**Prompt:**
> Define the state machine as a pure function module with a transition table. Include valid and invalid transitions, terminal state behavior, and how it integrates with the API layer.

**Outcome:** Pure function design:
- `isValidTransition(current, target): boolean`
- `getValidTransitions(current): TicketStatus[]`
- Explicit transition table (5 states, 5 valid transitions, all others invalid)
- Terminal states (Closed, Cancelled) with empty transition arrays
- Frontend reuses same logic for button rendering

---

## Prompt 3: Correctness Properties

**Context:** Needed formal properties for property-based testing.

**Prompt:**
> Define correctness properties that must hold universally across the system. These should be testable with fast-check and cover state machine invariants, security invariants, data integrity, and API contract guarantees.

**Outcome:** 25 numbered properties covering:
- State machine (Properties 1-2): Valid transitions succeed, invalid rejected
- Auth security (Properties 3-10): No passwordHash exposure, JWT claims, token round-trips, role enforcement
- Ticket CRUD (Properties 11-17): Creation defaults, validation, ordering, partial updates
- Comments (Properties 18): Whitespace rejection
- User management (Properties 19-22): Email uniqueness, partial updates, deletion guards, bcrypt cost
- Frontend (Property 23): Button rendering matches state machine
- API contract (Properties 24-25): Error structure, OpenAPI access
