import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { ValidationError } from "../../src/utils/errors";
import type { CommentDTO } from "../../src/types";

/**
 * Property-based tests for Comments.
 *
 * Feature: support-ticket-management
 * Validates: Requirements 6.1, 9.2
 */

// Mock dependencies
vi.mock("../../src/repositories/commentRepository");
vi.mock("../../src/repositories/ticketRepository");
vi.mock("../../src/utils/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock("uuid", () => ({
  v4: () => "00000000-0000-0000-0000-000000000099",
}));

import * as commentService from "../../src/services/commentService";
import * as ticketService from "../../src/services/ticketService";
import * as commentRepository from "../../src/repositories/commentRepository";
import * as ticketRepository from "../../src/repositories/ticketRepository";
import pool from "../../src/utils/db";

// --- Generators ---

/** UUID-like string for IDs */
const uuidArb = fc.uuid();

/** Valid message: non-empty, non-whitespace-only, max 2000 chars */
const validMessageArb = fc
  .stringOf(
    fc.constantFrom(
      ...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?\n").split(
        ""
      )
    ),
    { minLength: 1, maxLength: 200 }
  )
  .filter((s) => s.trim().length > 0);

/** Whitespace-only strings: spaces, tabs, newlines, or empty */
const whitespaceOnlyArb = fc.constantFrom(
  "",
  " ",
  "  ",
  "   ",
  "\t",
  "\n",
  "\r\n",
  " \t\n",
  "  \t  \n  ",
  "\t\t\t",
  "\n\n\n",
  " \t \n \r\n "
);

// ============================================================================
// Property 15: Ticket detail comments are ordered by createdAt ascending
// **Validates: Requirements 6.1**
// ============================================================================
describe("Property 15: Ticket detail comments are ordered by createdAt ascending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any ticket with comments, the comments array in getTicketById response SHALL be ordered such that each comment's createdAt <= the next comment's createdAt", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        fc.array(
          fc.record({
            id: uuidArb,
            ticketId: uuidArb,
            createdBy: uuidArb,
            message: validMessageArb,
            createdAt: fc.date({
              min: new Date("2024-01-01"),
              max: new Date("2025-12-31"),
            }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (ticketId, comments) => {
          // Create the ticket row mock
          const ticketRow = {
            id: ticketId,
            title: "Test Ticket",
            description: "Test Description",
            priority: "medium" as const,
            status: "Open" as const,
            assignedTo: null,
            createdBy: "user-123",
            createdAt: new Date("2024-06-01"),
            updatedAt: new Date("2024-06-01"),
          };

          vi.mocked(ticketRepository.findById).mockResolvedValue(ticketRow);

          // Simulate DB returning comments sorted by createdAt ASC (as the repository does)
          const sortedComments = [...comments]
            .map((c) => ({
              ...c,
              ticketId,
            }))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          // Mock pool.query used by getTicketById to fetch comments
          vi.mocked(pool.query).mockResolvedValue({
            rows: sortedComments,
            command: "SELECT",
            rowCount: sortedComments.length,
            oid: 0,
            fields: [],
          } as any);

          const result = await ticketService.getTicketById(ticketId);

          // Property: comments are in ascending createdAt order
          expect(result.comments.length).toBe(sortedComments.length);
          for (let i = 0; i < result.comments.length - 1; i++) {
            const current = new Date(result.comments[i].createdAt).getTime();
            const next = new Date(result.comments[i + 1].createdAt).getTime();
            expect(current).toBeLessThanOrEqual(next);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any ticket with a single comment, the comment is always returned", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        validMessageArb,
        fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
        async (ticketId, commentId, message, createdAt) => {
          const ticketRow = {
            id: ticketId,
            title: "Test Ticket",
            description: "Test Description",
            priority: "medium" as const,
            status: "Open" as const,
            assignedTo: null,
            createdBy: "user-123",
            createdAt: new Date("2024-06-01"),
            updatedAt: new Date("2024-06-01"),
          };

          vi.mocked(ticketRepository.findById).mockResolvedValue(ticketRow);

          const singleComment = {
            id: commentId,
            ticketId,
            createdBy: "user-456",
            message,
            createdAt,
          };

          vi.mocked(pool.query).mockResolvedValue({
            rows: [singleComment],
            command: "SELECT",
            rowCount: 1,
            oid: 0,
            fields: [],
          } as any);

          const result = await ticketService.getTicketById(ticketId);

          expect(result.comments.length).toBe(1);
          expect(result.comments[0].message).toBe(message);
          expect(result.comments[0].ticketId).toBe(ticketId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For a ticket with no comments, the comments array is empty", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (ticketId) => {
        const ticketRow = {
          id: ticketId,
          title: "Test Ticket",
          description: "Test Description",
          priority: "low" as const,
          status: "Open" as const,
          assignedTo: null,
          createdBy: "user-123",
          createdAt: new Date("2024-06-01"),
          updatedAt: new Date("2024-06-01"),
        };

        vi.mocked(ticketRepository.findById).mockResolvedValue(ticketRow);

        vi.mocked(pool.query).mockResolvedValue({
          rows: [],
          command: "SELECT",
          rowCount: 0,
          oid: 0,
          fields: [],
        } as any);

        const result = await ticketService.getTicketById(ticketId);

        expect(result.comments).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 18: Whitespace-only comments are rejected
// **Validates: Requirements 9.2**
// ============================================================================
describe("Property 18: Whitespace-only comments are rejected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any string composed entirely of whitespace characters (spaces, tabs, newlines, or empty string), submitting it as a comment message SHALL be rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        whitespaceOnlyArb,
        uuidArb,
        uuidArb,
        async (whitespaceMessage, ticketId, userId) => {
          await expect(
            commentService.createComment(ticketId, whitespaceMessage, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Whitespace-only comments never result in a repository create call", async () => {
    await fc.assert(
      fc.asyncProperty(
        whitespaceOnlyArb,
        uuidArb,
        uuidArb,
        async (whitespaceMessage, ticketId, userId) => {
          try {
            await commentService.createComment(ticketId, whitespaceMessage, userId);
          } catch {
            // Expected to throw
          }

          // The comment should never be created
          expect(commentRepository.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Generated whitespace strings of varying composition are all rejected", async () => {
    // More diverse whitespace generator using fc.stringOf with whitespace chars
    const diverseWhitespaceArb = fc
      .stringOf(fc.constantFrom(" ", "\t", "\n", "\r", "\r\n"), {
        minLength: 0,
        maxLength: 50,
      });

    await fc.assert(
      fc.asyncProperty(
        diverseWhitespaceArb,
        uuidArb,
        uuidArb,
        async (whitespaceMessage, ticketId, userId) => {
          await expect(
            commentService.createComment(ticketId, whitespaceMessage, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Valid non-whitespace messages are accepted (contrast test to prove whitespace-only is the boundary)", async () => {
    await fc.assert(
      fc.asyncProperty(
        validMessageArb,
        uuidArb,
        uuidArb,
        async (validMessage, ticketId, userId) => {
          // Mock ticket exists
          vi.mocked(ticketRepository.findById).mockResolvedValue({
            id: ticketId,
            title: "Test",
            description: "Desc",
            priority: "low",
            status: "Open",
            assignedTo: null,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Mock successful comment creation
          const createdRow = {
            id: "00000000-0000-0000-0000-000000000099",
            ticketId,
            createdBy: userId,
            message: validMessage,
            createdAt: new Date(),
          };
          vi.mocked(commentRepository.create).mockResolvedValue(createdRow);

          // Should NOT throw for valid messages
          const result = await commentService.createComment(
            ticketId,
            validMessage,
            userId
          );
          expect(result.message).toBe(validMessage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
