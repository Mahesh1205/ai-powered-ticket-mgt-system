import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError, NotFoundError, ConflictError } from "../../src/utils/errors";

// Mock dependencies
vi.mock("../../src/repositories/ticketRepository");
vi.mock("../../src/repositories/userRepository");
vi.mock("../../src/utils/db", () => ({
  default: { query: vi.fn() },
}));
vi.mock("uuid", () => ({
  v4: () => "test-uuid-1234",
}));

import * as ticketService from "../../src/services/ticketService";
import * as ticketRepository from "../../src/repositories/ticketRepository";
import * as userRepository from "../../src/repositories/userRepository";
import pool from "../../src/utils/db";

const mockTicketRow = {
  id: "test-uuid-1234",
  title: "Test Ticket",
  description: "A test ticket description",
  priority: "medium" as const,
  status: "Open" as const,
  assignedTo: null,
  createdBy: "user-1",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("ticketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTicket", () => {
    it("creates a ticket with valid input", async () => {
      vi.mocked(ticketRepository.create).mockResolvedValue(mockTicketRow);

      const result = await ticketService.createTicket(
        { title: "Test Ticket", description: "A test ticket description", priority: "medium" },
        "user-1"
      );

      expect(result.id).toBe("test-uuid-1234");
      expect(result.status).toBe("Open");
      expect(result.createdBy).toBe("user-1");
      expect(ticketRepository.create).toHaveBeenCalledWith({
        id: "test-uuid-1234",
        title: "Test Ticket",
        description: "A test ticket description",
        priority: "medium",
        createdBy: "user-1",
      });
    });

    it("throws ValidationError when title is empty", async () => {
      await expect(
        ticketService.createTicket({ title: "", description: "desc", priority: "low" }, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when title exceeds 200 characters", async () => {
      const longTitle = "a".repeat(201);
      await expect(
        ticketService.createTicket({ title: longTitle, description: "desc", priority: "low" }, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when description is empty", async () => {
      await expect(
        ticketService.createTicket({ title: "Title", description: "", priority: "low" }, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when description exceeds 5000 characters", async () => {
      const longDesc = "a".repeat(5001);
      await expect(
        ticketService.createTicket({ title: "Title", description: longDesc, priority: "low" }, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for invalid priority", async () => {
      await expect(
        ticketService.createTicket(
          { title: "Title", description: "desc", priority: "critical" as any },
          "user-1"
        )
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when priority is missing", async () => {
      await expect(
        ticketService.createTicket(
          { title: "Title", description: "desc", priority: "" as any },
          "user-1"
        )
      ).rejects.toThrow(ValidationError);
    });

    it("accepts title at exactly 200 characters", async () => {
      vi.mocked(ticketRepository.create).mockResolvedValue({
        ...mockTicketRow,
        title: "a".repeat(200),
      });

      const result = await ticketService.createTicket(
        { title: "a".repeat(200), description: "desc", priority: "high" },
        "user-1"
      );

      expect(result.title).toBe("a".repeat(200));
    });

    it("accepts description at exactly 5000 characters", async () => {
      vi.mocked(ticketRepository.create).mockResolvedValue({
        ...mockTicketRow,
        description: "a".repeat(5000),
      });

      const result = await ticketService.createTicket(
        { title: "Title", description: "a".repeat(5000), priority: "low" },
        "user-1"
      );

      expect(result.description).toBe("a".repeat(5000));
    });
  });

  describe("getTickets", () => {
    it("returns all tickets when no filters provided", async () => {
      vi.mocked(ticketRepository.findAll).mockResolvedValue([mockTicketRow]);

      const result = await ticketService.getTickets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-uuid-1234");
      expect(ticketRepository.findAll).toHaveBeenCalledWith({});
    });

    it("passes search filter to repository", async () => {
      vi.mocked(ticketRepository.findAll).mockResolvedValue([]);

      await ticketService.getTickets({ search: "bug" });

      expect(ticketRepository.findAll).toHaveBeenCalledWith({ search: "bug" });
    });

    it("passes status filter to repository", async () => {
      vi.mocked(ticketRepository.findAll).mockResolvedValue([]);

      await ticketService.getTickets({ status: "Open" });

      expect(ticketRepository.findAll).toHaveBeenCalledWith({ status: "Open" });
    });

    it("throws ValidationError for invalid status filter", async () => {
      await expect(
        ticketService.getTickets({ status: "InvalidStatus" })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getTicketById", () => {
    it("returns ticket with comments", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(pool.query).mockResolvedValue({
        rows: [
          {
            id: "comment-1",
            ticketId: "test-uuid-1234",
            createdBy: "user-1",
            message: "A comment",
            createdAt: new Date("2024-01-01T01:00:00Z"),
          },
        ],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await ticketService.getTicketById("test-uuid-1234");

      expect(result.id).toBe("test-uuid-1234");
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].message).toBe("A comment");
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(null);

      await expect(
        ticketService.getTicketById("nonexistent-id")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateTicket", () => {
    it("throws ValidationError when status field is included", async () => {
      await expect(
        ticketService.updateTicket("test-uuid-1234", { status: "Closed" } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when status field is included even with other fields", async () => {
      try {
        await ticketService.updateTicket("test-uuid-1234", {
          title: "New Title",
          status: "In Progress",
        } as any);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain("Status cannot be modified");
      }
    });

    it("updates ticket with valid data", async () => {
      vi.mocked(ticketRepository.update).mockResolvedValue({
        ...mockTicketRow,
        title: "Updated Title",
      });

      const result = await ticketService.updateTicket("test-uuid-1234", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
    });

    it("throws ValidationError when title exceeds 200 chars in update", async () => {
      await expect(
        ticketService.updateTicket("test-uuid-1234", { title: "a".repeat(201) })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when description exceeds 5000 chars in update", async () => {
      await expect(
        ticketService.updateTicket("test-uuid-1234", { description: "a".repeat(5001) })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for invalid priority in update", async () => {
      await expect(
        ticketService.updateTicket("test-uuid-1234", { priority: "urgent" as any })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when assignedTo references non-existent user", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        ticketService.updateTicket("test-uuid-1234", { assignedTo: "non-existent-user" })
      ).rejects.toThrow(ValidationError);
    });

    it("allows assignedTo null to unassign", async () => {
      vi.mocked(ticketRepository.update).mockResolvedValue({
        ...mockTicketRow,
        assignedTo: null,
      });

      const result = await ticketService.updateTicket("test-uuid-1234", {
        assignedTo: null,
      });

      expect(result.assignedTo).toBeNull();
    });

    it("validates assignedTo references existing user", async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: "user-2",
        name: "Agent",
        email: "agent@test.com",
        role: "agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(ticketRepository.update).mockResolvedValue({
        ...mockTicketRow,
        assignedTo: "user-2",
      });

      const result = await ticketService.updateTicket("test-uuid-1234", {
        assignedTo: "user-2",
      });

      expect(result.assignedTo).toBe("user-2");
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      vi.mocked(ticketRepository.update).mockResolvedValue(null);

      await expect(
        ticketService.updateTicket("nonexistent-id", { title: "New Title" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("transitionStatus", () => {
    it("transitions ticket from Open to In Progress", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(ticketRepository.updateStatus).mockResolvedValue({
        ...mockTicketRow,
        status: "In Progress",
      });

      const result = await ticketService.transitionStatus("test-uuid-1234", {
        status: "In Progress",
      });

      expect(result.status).toBe("In Progress");
    });

    it("throws ConflictError for invalid transition", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);

      await expect(
        ticketService.transitionStatus("test-uuid-1234", { status: "Closed" })
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(null);

      await expect(
        ticketService.transitionStatus("nonexistent-id", { status: "In Progress" })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError for invalid status value", async () => {
      await expect(
        ticketService.transitionStatus("test-uuid-1234", { status: "Invalid" as any })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when status is empty", async () => {
      await expect(
        ticketService.transitionStatus("test-uuid-1234", { status: "" as any })
      ).rejects.toThrow(ValidationError);
    });
  });
});
