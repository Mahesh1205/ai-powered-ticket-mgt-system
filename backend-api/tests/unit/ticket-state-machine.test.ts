import { describe, it, expect } from "vitest";
import { isValidTransition, getValidTransitions } from "../../src/services/ticketStateMachine";
import { TicketStatus } from "../../src/types";

describe("ticketStateMachine", () => {
  describe("isValidTransition", () => {
    it("allows Open → In Progress", () => {
      expect(isValidTransition("Open", "In Progress")).toBe(true);
    });

    it("allows Open → Cancelled", () => {
      expect(isValidTransition("Open", "Cancelled")).toBe(true);
    });

    it("allows In Progress → Resolved", () => {
      expect(isValidTransition("In Progress", "Resolved")).toBe(true);
    });

    it("allows In Progress → Cancelled", () => {
      expect(isValidTransition("In Progress", "Cancelled")).toBe(true);
    });

    it("allows Resolved → Closed", () => {
      expect(isValidTransition("Resolved", "Closed")).toBe(true);
    });

    it("rejects Open → Resolved", () => {
      expect(isValidTransition("Open", "Resolved")).toBe(false);
    });

    it("rejects Open → Closed", () => {
      expect(isValidTransition("Open", "Closed")).toBe(false);
    });

    it("rejects In Progress → Open", () => {
      expect(isValidTransition("In Progress", "Open")).toBe(false);
    });

    it("rejects all transitions from Closed (terminal state)", () => {
      const allStatuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cancelled"];
      for (const target of allStatuses) {
        expect(isValidTransition("Closed", target)).toBe(false);
      }
    });

    it("rejects all transitions from Cancelled (terminal state)", () => {
      const allStatuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cancelled"];
      for (const target of allStatuses) {
        expect(isValidTransition("Cancelled", target)).toBe(false);
      }
    });
  });

  describe("getValidTransitions", () => {
    it("returns [In Progress, Cancelled] for Open", () => {
      expect(getValidTransitions("Open")).toEqual(["In Progress", "Cancelled"]);
    });

    it("returns [Resolved, Cancelled] for In Progress", () => {
      expect(getValidTransitions("In Progress")).toEqual(["Resolved", "Cancelled"]);
    });

    it("returns [Closed] for Resolved", () => {
      expect(getValidTransitions("Resolved")).toEqual(["Closed"]);
    });

    it("returns empty array for Closed (terminal)", () => {
      expect(getValidTransitions("Closed")).toEqual([]);
    });

    it("returns empty array for Cancelled (terminal)", () => {
      expect(getValidTransitions("Cancelled")).toEqual([]);
    });
  });
});
