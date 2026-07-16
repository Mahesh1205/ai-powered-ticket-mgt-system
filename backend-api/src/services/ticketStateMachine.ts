import { TicketStatus } from "../types";

/**
 * Ticket Status State Machine
 *
 * Defines the valid status transitions for support tickets.
 * This is a pure function module with no side effects or database access.
 *
 * Transition Table:
 *   Open        → [In Progress, Cancelled]
 *   In Progress → [Resolved, Cancelled]
 *   Resolved    → [Closed]
 *   Closed      → [] (terminal state)
 *   Cancelled   → [] (terminal state)
 */

const transitionTable: Record<TicketStatus, TicketStatus[]> = {
  "Open": ["In Progress", "Cancelled"],
  "In Progress": ["Resolved", "Cancelled"],
  "Resolved": ["Closed"],
  "Closed": [],
  "Cancelled": [],
};

/**
 * Check whether a transition from currentStatus to targetStatus is valid.
 */
export function isValidTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus
): boolean {
  const allowed = transitionTable[currentStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(targetStatus);
}

/**
 * Get the list of valid target statuses from the given current status.
 * Returns an empty array for terminal states (Closed, Cancelled).
 */
export function getValidTransitions(currentStatus: TicketStatus): TicketStatus[] {
  return transitionTable[currentStatus] ?? [];
}
