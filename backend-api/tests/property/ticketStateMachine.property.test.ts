import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isValidTransition, getValidTransitions } from "../../src/services/ticketStateMachine";
import { TicketStatus } from "../../src/types";

/**
 * Property-based tests for the Ticket State Machine.
 *
 * Feature: support-ticket-management
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

// All possible ticket statuses
const allStatuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cancelled"];

// The complete transition table as defined in the design
const transitionTable: Record<TicketStatus, TicketStatus[]> = {
  "Open": ["In Progress", "Cancelled"],
  "In Progress": ["Resolved", "Cancelled"],
  "Resolved": ["Closed"],
  "Closed": [],
  "Cancelled": [],
};

// Build all valid (current, target) pairs from the transition table
const validPairs: Array<[TicketStatus, TicketStatus]> = [];
for (const [from, targets] of Object.entries(transitionTable)) {
  for (const to of targets) {
    validPairs.push([from as TicketStatus, to]);
  }
}

// Build all invalid (current, target) pairs — pairs NOT in the transition table
const invalidPairs: Array<[TicketStatus, TicketStatus]> = [];
for (const from of allStatuses) {
  for (const to of allStatuses) {
    if (!transitionTable[from].includes(to)) {
      invalidPairs.push([from, to]);
    }
  }
}

// Arbitrary that generates a valid (current, target) pair
const validPairArb = fc.constantFrom(...validPairs);

// Arbitrary that generates an invalid (current, target) pair
const invalidPairArb = fc.constantFrom(...invalidPairs);

describe("Ticket State Machine - Property Tests", () => {
  describe("Property 1: Valid state machine transitions succeed", () => {
    /**
     * **Validates: Requirements 8.1, 8.3**
     *
     * For any ticket in a non-terminal status and for any target status that is
     * a valid transition from that status (per the transition table), isValidTransition
     * returns true and getValidTransitions includes the target.
     */
    it("isValidTransition returns true for all valid (current, target) pairs", () => {
      fc.assert(
        fc.property(validPairArb, ([currentStatus, targetStatus]) => {
          expect(isValidTransition(currentStatus, targetStatus)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("getValidTransitions includes the target for all valid transitions", () => {
      fc.assert(
        fc.property(validPairArb, ([currentStatus, targetStatus]) => {
          const validTargets = getValidTransitions(currentStatus);
          expect(validTargets).toContain(targetStatus);
        }),
        { numRuns: 100 }
      );
    });

    it("getValidTransitions returns exactly the transitions defined in the table", () => {
      fc.assert(
        fc.property(fc.constantFrom(...allStatuses), (status) => {
          const result = getValidTransitions(status);
          expect(result).toEqual(transitionTable[status]);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2: Invalid state machine transitions are rejected and preserve state", () => {
    /**
     * **Validates: Requirements 8.2, 8.4**
     *
     * For any ticket in any status and for any target status that is NOT a valid
     * transition from the current status, isValidTransition returns false and
     * getValidTransitions does not include the target.
     */
    it("isValidTransition returns false for all invalid (current, target) pairs", () => {
      fc.assert(
        fc.property(invalidPairArb, ([currentStatus, targetStatus]) => {
          expect(isValidTransition(currentStatus, targetStatus)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("getValidTransitions does not include invalid targets", () => {
      fc.assert(
        fc.property(invalidPairArb, ([currentStatus, targetStatus]) => {
          const validTargets = getValidTransitions(currentStatus);
          expect(validTargets).not.toContain(targetStatus);
        }),
        { numRuns: 100 }
      );
    });

    it("terminal states (Closed, Cancelled) have no valid transitions", () => {
      const terminalStatuses: TicketStatus[] = ["Closed", "Cancelled"];
      fc.assert(
        fc.property(
          fc.constantFrom(...terminalStatuses),
          fc.constantFrom(...allStatuses),
          (terminalStatus, anyTarget) => {
            expect(isValidTransition(terminalStatus, anyTarget)).toBe(false);
            expect(getValidTransitions(terminalStatus)).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
