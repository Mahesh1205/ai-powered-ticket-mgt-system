# Ticket State Machine

## Overview

The ticket lifecycle is governed by a deterministic state machine that enforces valid status transitions. The state machine is implemented as a pure function module (`ticketStateMachine.ts`) that serves as the single source of truth for all transition validation — both on the backend (HTTP 409 rejection) and frontend (button rendering).

## States

| State | Description | Terminal? |
|-------|-------------|-----------|
| **Open** | Newly created ticket awaiting action | No |
| **In Progress** | Work has begun on the ticket | No |
| **Resolved** | Issue has been addressed, pending closure | No |
| **Closed** | Ticket is confirmed complete | Yes |
| **Cancelled** | Ticket was abandoned or invalid | Yes |

## Transition Table

| Current State | Valid Targets | Invalid Targets |
|---------------|--------------|-----------------|
| Open | In Progress, Cancelled | Resolved, Closed |
| In Progress | Resolved, Cancelled | Open, Closed |
| Resolved | Closed | Open, In Progress, Cancelled |
| Closed | _(none — terminal)_ | All states |
| Cancelled | _(none — terminal)_ | All states |

## State Diagram

```
                    ┌──────────────────────────────────────────┐
                    │          TICKET LIFECYCLE                  │
                    └──────────────────────────────────────────┘

                              ┌─────────┐
                    Create ──►│  Open   │
                              └────┬────┘
                                   │
                      ┌────────────┼────────────┐
                      │                         │
                      ▼                         ▼
               ┌─────────────┐          ┌───────────┐
               │ In Progress │          │ Cancelled │ ◄── TERMINAL
               └──────┬──────┘          └───────────┘
                      │                       ▲
              ┌───────┼───────┐               │
              │               │               │
              ▼               └───────────────┘
        ┌──────────┐
        │ Resolved │
        └─────┬────┘
              │
              ▼
        ┌──────────┐
        │  Closed  │ ◄── TERMINAL
        └──────────┘
```

## Implementation

### Backend (`ticketStateMachine.ts`)

```typescript
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  "Open": ["In Progress", "Cancelled"],
  "In Progress": ["Resolved", "Cancelled"],
  "Resolved": ["Closed"],
  "Closed": [],
  "Cancelled": [],
};

function isValidTransition(current: TicketStatus, target: TicketStatus): boolean {
  return TRANSITIONS[current].includes(target);
}

function getValidTransitions(current: TicketStatus): TicketStatus[] {
  return TRANSITIONS[current];
}
```

### Frontend Usage

The frontend uses the same transition logic to render only valid status buttons:
- For non-terminal states: display buttons for each valid target status
- For terminal states (Closed, Cancelled): display no transition buttons
- On HTTP 409 response: show an error message without page reload

## API Endpoint

**PATCH /api/tickets/:id/status**

```json
// Request
{ "status": "In Progress" }

// Success Response (200)
{ "id": "...", "status": "In Progress", ... }

// Invalid Transition Response (409)
{ "error": "Invalid status transition from Open to Closed", "code": "CONFLICT" }
```

## Enforcement Rules

1. **Single endpoint** — Status can ONLY be changed via `PATCH /api/tickets/:id/status`. Attempting to set `status` via `PATCH /api/tickets/:id` returns HTTP 400.
2. **Server-side validation** — The backend always validates transitions regardless of frontend checks.
3. **Terminal states are final** — Once a ticket reaches Closed or Cancelled, no further transitions are possible.
4. **Invalid status values** — Requesting a transition to a value not in the defined states returns HTTP 400 (not 409).

## Property-Based Test Coverage

- **Property 1:** Valid transitions succeed and update status correctly
- **Property 2:** Invalid transitions are rejected (HTTP 409) and preserve current status
- **Property 23:** Frontend displays exactly the valid transition buttons for each state
