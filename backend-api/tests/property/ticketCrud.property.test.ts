import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { ValidationError } from "../../src/utils/errors";
import type { TicketPriority, TicketStatus } from "../../src/types";
import type { TicketRow } from "../../src/repositories/ticketRepository";

/**
 * Property-based tests for Ticket Creation and Updates.
 *
 * Feature: support-ticket-management
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.6, 16.1, 16.2
 */

// Mock dependencies
vi.mock("../../src/repositories/ticketRepository");
vi.mock("../../src/repositories/userRepository");
vi.mock("../../src/utils/db", () => ({
  default: { query: vi.fn() },
}));

// We need a stable UUID mock for property 11
let mockUuid = "00000000-0000-0000-0000-000000000001";
vi.mock("uuid", () => ({
  v4: () => mockUuid,
}));

import * as ticketService from "../../src/services/ticketService";
import * as ticketRepository from "../../src/repositories/ticketRepository";
import * as userRepository from "../../src/repositories/userRepository";

// --- Generators ---

/** Valid priority values */
const validPriorityArb = fc.constantFrom<TicketPriority>("low", "medium", "high");

/** Valid ticket status values */
const allStatuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cancelled"];
const validStatusArb = fc.constantFrom<TicketStatus>(...allStatuses);

/** UUID-like string for user IDs */
const uuidArb = fc.uuid();

/** Valid title: non-empty, max 200 chars, non-whitespace-only */
const validTitleArb = fc
  .stringOf(fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?").split("")), {
    minLength: 1,
    maxLength: 200,
  })
  .filter((s) => s.trim().length > 0);

/** Valid description: non-empty, max 5000 chars, non-whitespace-only */
const validDescriptionArb = fc
  .stringOf(fc.constantFrom(...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?\n").split("")), {
    minLength: 1,
    maxLength: 500, // Keep smaller for performance; logic tests length > 5000
  })
  .filter((s) => s.trim().length > 0);

/** Invalid priority: not in {low, medium, high} */
const invalidPriorityArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !["low", "medium", "high", ""].includes(s));

// ============================================================================
// Property 11: Valid ticket creation produces correct defaults
// **Validates: Requirements 4.1, 16.1, 16.2**
// ============================================================================
describe("Property 11: Valid ticket creation produces correct defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any valid ticket creation input, the created ticket SHALL have status 'Open', a valid UUID as id, the requesting user as createdBy, and timestamps", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        validDescriptionArb,
        validPriorityArb,
        uuidArb,
        async (title, description, priority, userId) => {
          // Set up mock to return a row that simulates DB behavior
          const now = new Date();
          const expectedRow: TicketRow = {
            id: mockUuid,
            title,
            description,
            priority,
            status: "Open",
            assignedTo: null,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          };

          vi.mocked(ticketRepository.create).mockResolvedValue(expectedRow);

          const result = await ticketService.createTicket(
            { title, description, priority },
            userId
          );

          // Property assertions:
          // 1. Status is always "Open"
          expect(result.status).toBe("Open");
          // 2. ID is a valid UUID (non-empty string)
          expect(result.id).toBeTruthy();
          expect(typeof result.id).toBe("string");
          // 3. createdBy matches the requesting user
          expect(result.createdBy).toBe(userId);
          // 4. Timestamps are present and valid ISO strings
          expect(result.createdAt).toBeTruthy();
          expect(result.updatedAt).toBeTruthy();
          expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
          expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);
          // 5. Title and description match input
          expect(result.title).toBe(title);
          expect(result.description).toBe(description);
          expect(result.priority).toBe(priority);
          // 6. assignedTo is null by default
          expect(result.assignedTo).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("The repository create is called with correct parameters including generated UUID", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        validDescriptionArb,
        validPriorityArb,
        uuidArb,
        async (title, description, priority, userId) => {
          const now = new Date();
          vi.mocked(ticketRepository.create).mockResolvedValue({
            id: mockUuid,
            title,
            description,
            priority,
            status: "Open",
            assignedTo: null,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          });

          await ticketService.createTicket({ title, description, priority }, userId);

          expect(ticketRepository.create).toHaveBeenCalledWith({
            id: mockUuid,
            title,
            description,
            priority,
            createdBy: userId,
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 12: Invalid ticket creation input is rejected
// **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
// ============================================================================
describe("Property 12: Invalid ticket creation input is rejected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Empty title is always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", "   ", "\t", "\n"),
        validDescriptionArb,
        validPriorityArb,
        uuidArb,
        async (emptyTitle, description, priority, userId) => {
          await expect(
            ticketService.createTicket({ title: emptyTitle, description, priority }, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Title exceeding 200 characters is always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 201, max: 500 }),
        validDescriptionArb,
        validPriorityArb,
        uuidArb,
        async (titleLen, description, priority, userId) => {
          const longTitle = "a".repeat(titleLen);
          await expect(
            ticketService.createTicket({ title: longTitle, description, priority }, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Description exceeding 5000 characters is always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5001, max: 6000 }),
        validTitleArb,
        validPriorityArb,
        uuidArb,
        async (descLen, title, priority, userId) => {
          const longDesc = "a".repeat(descLen);
          await expect(
            ticketService.createTicket({ title, description: longDesc, priority }, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Invalid priority values are always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        validDescriptionArb,
        invalidPriorityArb,
        uuidArb,
        async (title, description, invalidPriority, userId) => {
          await expect(
            ticketService.createTicket(
              { title, description, priority: invalidPriority as any },
              userId
            )
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Empty/missing priority is always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        validDescriptionArb,
        uuidArb,
        async (title, description, userId) => {
          await expect(
            ticketService.createTicket({ title, description, priority: "" as any }, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Empty description is always rejected with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        validTitleArb,
        fc.constantFrom("", "   ", "\t", "\n"),
        validPriorityArb,
        uuidArb,
        async (title, emptyDesc, priority, userId) => {
          await expect(
            ticketService.createTicket({ title, description: emptyDesc, priority }, userId)
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 13: Ticket search and filter results match criteria
// **Validates: Requirements 5.2, 5.3, 5.4**
// ============================================================================
describe("Property 13: Ticket search and filter results match criteria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("When a search keyword is provided, every returned ticket has the keyword in title or description (case-insensitive)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...("abcdefghijklmnopqrstuvwxyz").split("")), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.array(
          fc.record({
            id: uuidArb,
            title: validTitleArb,
            description: validDescriptionArb,
            priority: validPriorityArb,
            status: validStatusArb,
            assignedTo: fc.option(uuidArb, { nil: null }),
            createdBy: uuidArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (keyword, tickets) => {
          // Simulate repository filtering: only return tickets that contain keyword
          const matchingTickets = tickets.filter(
            (t) =>
              t.title.toLowerCase().includes(keyword.toLowerCase()) ||
              t.description.toLowerCase().includes(keyword.toLowerCase())
          );

          vi.mocked(ticketRepository.findAll).mockResolvedValue(matchingTickets as TicketRow[]);

          const results = await ticketService.getTickets({ search: keyword });

          // Property: every result contains the keyword in title or description
          for (const ticket of results) {
            const titleLower = ticket.title.toLowerCase();
            const descLower = ticket.description.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            expect(
              titleLower.includes(keywordLower) || descLower.includes(keywordLower)
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("When a status filter is provided, every returned ticket matches that status exactly", async () => {
    await fc.assert(
      fc.asyncProperty(
        validStatusArb,
        fc.array(
          fc.record({
            id: uuidArb,
            title: validTitleArb,
            description: validDescriptionArb,
            priority: validPriorityArb,
            status: validStatusArb,
            assignedTo: fc.option(uuidArb, { nil: null }),
            createdBy: uuidArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (statusFilter, tickets) => {
          // Simulate repository filtering: only return tickets matching status
          const matchingTickets = tickets.filter((t) => t.status === statusFilter);

          vi.mocked(ticketRepository.findAll).mockResolvedValue(matchingTickets as TicketRow[]);

          const results = await ticketService.getTickets({ status: statusFilter });

          // Property: every result has the filtered status
          for (const ticket of results) {
            expect(ticket.status).toBe(statusFilter);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("When both search and status are provided, every returned ticket matches both criteria", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(fc.constantFrom(...("abcdefghijklmnopqrstuvwxyz").split("")), {
          minLength: 2,
          maxLength: 10,
        }),
        validStatusArb,
        fc.array(
          fc.record({
            id: uuidArb,
            title: validTitleArb,
            description: validDescriptionArb,
            priority: validPriorityArb,
            status: validStatusArb,
            assignedTo: fc.option(uuidArb, { nil: null }),
            createdBy: uuidArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (keyword, statusFilter, tickets) => {
          // Simulate repository filtering: match both keyword AND status
          const matchingTickets = tickets.filter(
            (t) =>
              t.status === statusFilter &&
              (t.title.toLowerCase().includes(keyword.toLowerCase()) ||
                t.description.toLowerCase().includes(keyword.toLowerCase()))
          );

          vi.mocked(ticketRepository.findAll).mockResolvedValue(matchingTickets as TicketRow[]);

          const results = await ticketService.getTickets({ search: keyword, status: statusFilter });

          // Property: every result matches both criteria
          for (const ticket of results) {
            expect(ticket.status).toBe(statusFilter);
            const titleLower = ticket.title.toLowerCase();
            const descLower = ticket.description.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            expect(
              titleLower.includes(keywordLower) || descLower.includes(keywordLower)
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 14: Ticket list is ordered by createdAt descending
// **Validates: Requirements 5.1**
// ============================================================================
describe("Property 14: Ticket list is ordered by createdAt descending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any response from getTickets, tickets are ordered such that each ticket's createdAt >= the next ticket's createdAt", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: uuidArb,
            title: validTitleArb,
            description: validDescriptionArb,
            priority: validPriorityArb,
            status: validStatusArb,
            assignedTo: fc.option(uuidArb, { nil: null }),
            createdBy: uuidArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (tickets) => {
          // Sort descending by createdAt (simulating what the DB/repository does)
          const sortedTickets = [...tickets].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );

          vi.mocked(ticketRepository.findAll).mockResolvedValue(sortedTickets as TicketRow[]);

          const results = await ticketService.getTickets();

          // Property: for each consecutive pair, createdAt[i] >= createdAt[i+1]
          for (let i = 0; i < results.length - 1; i++) {
            const current = new Date(results[i].createdAt).getTime();
            const next = new Date(results[i + 1].createdAt).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Ordering property holds with status filter applied", async () => {
    await fc.assert(
      fc.asyncProperty(
        validStatusArb,
        fc.array(
          fc.record({
            id: uuidArb,
            title: validTitleArb,
            description: validDescriptionArb,
            priority: validPriorityArb,
            status: validStatusArb,
            assignedTo: fc.option(uuidArb, { nil: null }),
            createdBy: uuidArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (statusFilter, tickets) => {
          const filtered = tickets
            .filter((t) => t.status === statusFilter)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          vi.mocked(ticketRepository.findAll).mockResolvedValue(filtered as TicketRow[]);

          const results = await ticketService.getTickets({ status: statusFilter });

          for (let i = 0; i < results.length - 1; i++) {
            const current = new Date(results[i].createdAt).getTime();
            const next = new Date(results[i + 1].createdAt).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 16: Ticket partial update preserves unmodified fields
// **Validates: Requirements 7.1**
// ============================================================================
describe("Property 16: Ticket partial update preserves unmodified fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("When partially updating a ticket, fields not included in the update remain unchanged", async () => {
    // Generate an existing ticket and a partial update (subset of updatable fields)
    const existingTicketArb = fc.record({
      id: uuidArb,
      title: validTitleArb,
      description: validDescriptionArb,
      priority: validPriorityArb,
      status: validStatusArb,
      assignedTo: fc.option(uuidArb, { nil: null }),
      createdBy: uuidArb,
      createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
      updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
    });

    // Generate which fields to include in the update (at least one)
    const fieldsToUpdateArb = fc
      .subarray(["title", "description", "priority", "assignedTo"] as const, {
        minLength: 1,
        maxLength: 4,
      });

    await fc.assert(
      fc.asyncProperty(
        existingTicketArb,
        fieldsToUpdateArb,
        validTitleArb,
        validDescriptionArb,
        validPriorityArb,
        fc.option(uuidArb, { nil: null }),
        async (existingTicket, fieldsToUpdate, newTitle, newDesc, newPriority, newAssignedTo) => {
          // Build the update payload with only selected fields
          const updatePayload: Record<string, unknown> = {};
          if (fieldsToUpdate.includes("title")) updatePayload.title = newTitle;
          if (fieldsToUpdate.includes("description")) updatePayload.description = newDesc;
          if (fieldsToUpdate.includes("priority")) updatePayload.priority = newPriority;
          if (fieldsToUpdate.includes("assignedTo")) updatePayload.assignedTo = newAssignedTo;

          // Mock userRepository.findById if assignedTo is being set to a non-null value
          if (updatePayload.assignedTo && updatePayload.assignedTo !== null) {
            vi.mocked(userRepository.findById).mockResolvedValue({
              id: updatePayload.assignedTo as string,
              name: "Test User",
              email: "test@example.com",
              role: "agent",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Simulate the DB update: apply only the changed fields
          const updatedRow: TicketRow = {
            ...existingTicket,
            ...(fieldsToUpdate.includes("title") ? { title: newTitle } : {}),
            ...(fieldsToUpdate.includes("description") ? { description: newDesc } : {}),
            ...(fieldsToUpdate.includes("priority") ? { priority: newPriority } : {}),
            ...(fieldsToUpdate.includes("assignedTo") ? { assignedTo: newAssignedTo } : {}),
            updatedAt: new Date(), // updatedAt changes
          };

          vi.mocked(ticketRepository.update).mockResolvedValue(updatedRow);

          const result = await ticketService.updateTicket(existingTicket.id, updatePayload as any);

          // Property: fields NOT in the update remain unchanged
          if (!fieldsToUpdate.includes("title")) {
            expect(result.title).toBe(existingTicket.title);
          }
          if (!fieldsToUpdate.includes("description")) {
            expect(result.description).toBe(existingTicket.description);
          }
          if (!fieldsToUpdate.includes("priority")) {
            expect(result.priority).toBe(existingTicket.priority);
          }
          if (!fieldsToUpdate.includes("assignedTo")) {
            expect(result.assignedTo).toBe(existingTicket.assignedTo);
          }

          // Status NEVER changes via update
          expect(result.status).toBe(existingTicket.status);
          // createdBy NEVER changes
          expect(result.createdBy).toBe(existingTicket.createdBy);
          // createdAt NEVER changes
          expect(result.createdAt).toBe(existingTicket.createdAt.toISOString());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 17: Status cannot be modified via ticket PATCH endpoint
// **Validates: Requirements 7.6**
// ============================================================================
describe("Property 17: Status cannot be modified via ticket PATCH endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any PATCH request body that includes a status field, the API SHALL reject with ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        // Status can be any value - valid or invalid - it should always be rejected
        fc.oneof(
          validStatusArb,
          fc.string({ minLength: 1, maxLength: 30 })
        ),
        // Optionally include other valid fields alongside status
        fc.option(validTitleArb, { nil: undefined }),
        fc.option(validDescriptionArb, { nil: undefined }),
        fc.option(validPriorityArb, { nil: undefined }),
        async (ticketId, statusValue, title, description, priority) => {
          const updatePayload: Record<string, unknown> = { status: statusValue };
          if (title !== undefined) updatePayload.title = title;
          if (description !== undefined) updatePayload.description = description;
          if (priority !== undefined) updatePayload.priority = priority;

          try {
            await ticketService.updateTicket(ticketId, updatePayload as any);
            // Should not reach here
            expect.fail("Should have thrown ValidationError");
          } catch (e) {
            expect(e).toBeInstanceOf(ValidationError);
            expect((e as ValidationError).message).toContain("Status cannot be modified");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Status rejection happens regardless of whether the status value is a valid TicketStatus", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        validStatusArb, // Use only valid status values to prove the point
        async (ticketId, validStatus) => {
          try {
            await ticketService.updateTicket(ticketId, { status: validStatus } as any);
            expect.fail("Should have thrown ValidationError");
          } catch (e) {
            expect(e).toBeInstanceOf(ValidationError);
            // Verify the error details mention the status endpoint
            const details = (e as ValidationError).details;
            expect(details).toBeDefined();
            expect(details?.status).toContain("PATCH /api/tickets/:id/status");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
