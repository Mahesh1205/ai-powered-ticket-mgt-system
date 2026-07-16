import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError, NotFoundError } from "../../src/utils/errors";

// Mock dependencies
vi.mock("../../src/repositories/commentRepository");
vi.mock("../../src/repositories/ticketRepository");
vi.mock("uuid", () => ({
  v4: () => "comment-uuid-1234",
}));

import * as commentService from "../../src/services/commentService";
import * as commentRepository from "../../src/repositories/commentRepository";
import * as ticketRepository from "../../src/repositories/ticketRepository";

const mockTicketRow = {
  id: "ticket-1",
  title: "Test Ticket",
  description: "A test ticket",
  priority: "medium" as const,
  status: "Open" as const,
  assignedTo: null,
  createdBy: "user-1",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const mockCommentRow = {
  id: "comment-uuid-1234",
  ticketId: "ticket-1",
  createdBy: "user-1",
  message: "This is a comment",
  createdAt: new Date("2024-01-01T01:00:00Z"),
};

describe("commentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createComment", () => {
    it("creates a comment with valid input", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(commentRepository.create).mockResolvedValue(mockCommentRow);

      const result = await commentService.createComment("ticket-1", "This is a comment", "user-1");

      expect(result.id).toBe("comment-uuid-1234");
      expect(result.ticketId).toBe("ticket-1");
      expect(result.createdBy).toBe("user-1");
      expect(result.message).toBe("This is a comment");
      expect(result.createdAt).toBe("2024-01-01T01:00:00.000Z");
      expect(commentRepository.create).toHaveBeenCalledWith({
        id: "comment-uuid-1234",
        ticketId: "ticket-1",
        createdBy: "user-1",
        message: "This is a comment",
      });
    });

    it("throws ValidationError when message is empty string", async () => {
      await expect(
        commentService.createComment("ticket-1", "", "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when message is whitespace-only", async () => {
      await expect(
        commentService.createComment("ticket-1", "   \t\n  ", "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when message is null/undefined", async () => {
      await expect(
        commentService.createComment("ticket-1", null as any, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when message exceeds 2000 characters", async () => {
      const longMessage = "a".repeat(2001);
      await expect(
        commentService.createComment("ticket-1", longMessage, "user-1")
      ).rejects.toThrow(ValidationError);
    });

    it("accepts message at exactly 2000 characters", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(commentRepository.create).mockResolvedValue({
        ...mockCommentRow,
        message: "a".repeat(2000),
      });

      const result = await commentService.createComment("ticket-1", "a".repeat(2000), "user-1");

      expect(result.message).toBe("a".repeat(2000));
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(null);

      await expect(
        commentService.createComment("nonexistent-ticket", "A comment", "user-1")
      ).rejects.toThrow(NotFoundError);
    });

    it("validates message before checking ticket existence", async () => {
      // Empty message should fail validation before any DB call
      await expect(
        commentService.createComment("ticket-1", "", "user-1")
      ).rejects.toThrow(ValidationError);

      expect(ticketRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe("getCommentsByTicketId", () => {
    it("returns comments for an existing ticket", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(commentRepository.findByTicketId).mockResolvedValue([
        mockCommentRow,
        { ...mockCommentRow, id: "comment-2", createdAt: new Date("2024-01-01T02:00:00Z") },
      ]);

      const result = await commentService.getCommentsByTicketId("ticket-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("comment-uuid-1234");
      expect(result[1].id).toBe("comment-2");
    });

    it("returns empty array when ticket has no comments", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(mockTicketRow);
      vi.mocked(commentRepository.findByTicketId).mockResolvedValue([]);

      const result = await commentService.getCommentsByTicketId("ticket-1");

      expect(result).toHaveLength(0);
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      vi.mocked(ticketRepository.findById).mockResolvedValue(null);

      await expect(
        commentService.getCommentsByTicketId("nonexistent-ticket")
      ).rejects.toThrow(NotFoundError);
    });
  });
});
